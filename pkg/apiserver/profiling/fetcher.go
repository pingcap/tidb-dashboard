// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	_ "embed"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/scheduling"
	"github.com/pingcap/tidb-dashboard/pkg/ticdc"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/tiflash"
	"github.com/pingcap/tidb-dashboard/pkg/tikv"
	"github.com/pingcap/tidb-dashboard/pkg/tiproxy"
	"github.com/pingcap/tidb-dashboard/pkg/tso"
)

const (
	maxProfilingTimeout = time.Minute * 5
)

type fetchOptions struct {
	ip   string
	port int
	path string
}

type profileFetcher interface {
	fetch(op *fetchOptions) ([]byte, error)
}

type fetchers struct {
	tikv       profileFetcher
	tiflash    profileFetcher
	tidb       profileFetcher
	pd         profileFetcher
	ticdc      profileFetcher
	tiproxy    profileFetcher
	tso        profileFetcher
	scheduling profileFetcher
}

var newFetchers = fx.Provide(func(
	tikvClient *tikv.Client,
	tidbClient *tidb.Client,
	pdClient *pd.Client,
	tiflashClient *tiflash.Client,
	ticdcClient *ticdc.Client,
	tiproxyClient *tiproxy.Client,
	tsoClient *tso.Client,
	schedulingClient *scheduling.Client,
	config *config.Config,
) *fetchers {
	return &fetchers{
		tikv: &tikvFetcher{
			client: tikvClient,
		},
		tiflash: &tiflashFetcher{
			client: tiflashClient,
		},
		tidb: &tidbFetcher{
			client: tidbClient,
		},
		pd: &pdFetcher{
			client:              pdClient,
			statusAPIHTTPScheme: config.GetClusterHTTPScheme(),
		},
		ticdc: &ticdcFecther{
			client: ticdcClient,
		},
		tiproxy: &tiproxyFecther{
			client: tiproxyClient,
		},
		tso: &tsoFetcher{
			client: tsoClient,
		},
		scheduling: &schedulingFetcher{
			client: schedulingClient,
		},
	}
})

type tikvFetcher struct {
	client *tikv.Client
}

//go:embed jeprof.in
var jeprof string

func (f *tikvFetcher) fetch(op *fetchOptions) ([]byte, error) {
	if strings.HasSuffix(op.path, "heap") {
		scheme := f.client.GetHTTPScheme()
		cmd := exec.Command("perl", "/dev/stdin", "--raw", scheme+"://"+op.ip+":"+strconv.Itoa(op.port)+op.path) //nolint:gosec
		cmd.Stdin = strings.NewReader(jeprof)
		if f.client.GetTLSInfo() != nil {
			cmd.Env = append(os.Environ(), fmt.Sprintf(
				"URL_FETCHER=curl -s --cert %s --key %s --cacert %s",
				f.client.GetTLSInfo().CertFile,
				f.client.GetTLSInfo().KeyFile,
				f.client.GetTLSInfo().TrustedCAFile,
			))
		}
		stdout, err := cmd.StdoutPipe()
		if err != nil {
			return nil, err
		}
		stderr, err := cmd.StderrPipe()
		if err != nil {
			return nil, err
		}
		// use jeprof to fetch tikv heap profile
		err = cmd.Start()
		if err != nil {
			return nil, err
		}
		data, err := io.ReadAll(stdout)
		if err != nil {
			return nil, err
		}
		errMsg, err := io.ReadAll(stderr)
		if err != nil {
			return nil, err
		}
		err = cmd.Wait()
		if err != nil {
			return nil, fmt.Errorf("failed to fetch tikv heap profile: %s", errMsg)
		}
		return data, nil
	}
	return f.client.WithTimeout(maxProfilingTimeout).AddRequestHeader("Content-Type", "application/protobuf").SendGetRequest(op.ip, op.port, op.path)
}

type tiflashFetcher struct {
	client *tiflash.Client
}

func (f *tiflashFetcher) fetch(op *fetchOptions) ([]byte, error) {
	if strings.HasSuffix(op.path, "heap") {
		scheme := f.client.GetHTTPScheme()
		cmd := exec.Command("perl", "/dev/stdin", "--raw", scheme+"://"+op.ip+":"+strconv.Itoa(op.port)+op.path) //nolint:gosec
		cmd.Stdin = strings.NewReader(jeprof)
		stdout, err := cmd.StdoutPipe()
		if err != nil {
			return nil, err
		}
		stderr, err := cmd.StderrPipe()
		if err != nil {
			return nil, err
		}
		// use jeprof to fetch tiflash heap profile
		err = cmd.Start()
		if err != nil {
			return nil, err
		}
		data, err := io.ReadAll(stdout)
		if err != nil {
			return nil, err
		}
		errMsg, err := io.ReadAll(stderr)
		if err != nil {
			return nil, err
		}
		err = cmd.Wait()
		if err != nil {
			return nil, fmt.Errorf("failed to fetch tiflash heap profile: %s", errMsg)
		}
		return data, nil
	}
	return f.client.WithTimeout(maxProfilingTimeout).AddRequestHeader("Content-Type", "application/protobuf").SendGetRequest(op.ip, op.port, op.path)
}

type tidbFetcher struct {
	client *tidb.Client
}

func (f *tidbFetcher) fetch(op *fetchOptions) ([]byte, error) {
	return f.client.WithEnforcedStatusAPIAddress(op.ip, op.port).WithStatusAPITimeout(maxProfilingTimeout).SendGetRequest(op.path)
}

type pdFetcher struct {
	client              *pd.Client
	statusAPIHTTPScheme string
}

func (f *pdFetcher) fetch(op *fetchOptions) ([]byte, error) {
	baseURL := fmt.Sprintf("%s://%s", f.statusAPIHTTPScheme, net.JoinHostPort(op.ip, strconv.Itoa(op.port)))
	return f.client.
		WithTimeout(maxProfilingTimeout).
		WithBaseURL(baseURL).
		WithoutPrefix(). // pprof API does not have /pd/api/v1 prefix
		SendGetRequest(op.path)
}

type ticdcFecther struct {
	client *ticdc.Client
}

func (f *ticdcFecther) fetch(op *fetchOptions) ([]byte, error) {
	return f.client.WithTimeout(maxProfilingTimeout).SendGetRequest(op.ip, op.port, op.path)
}

type tiproxyFecther struct {
	client *tiproxy.Client
}

func (f *tiproxyFecther) fetch(op *fetchOptions) ([]byte, error) {
	return f.client.WithTimeout(maxProfilingTimeout).SendGetRequest(op.ip, op.port, op.path)
}

type tsoFetcher struct {
	client *tso.Client
}

func (f *tsoFetcher) fetch(op *fetchOptions) ([]byte, error) {
	return f.client.WithTimeout(maxProfilingTimeout).SendGetRequest(op.ip, op.port, op.path)
}

type schedulingFetcher struct {
	client *scheduling.Client
}

func (f *schedulingFetcher) fetch(op *fetchOptions) ([]byte, error) {
	return f.client.WithTimeout(maxProfilingTimeout).SendGetRequest(op.ip, op.port, op.path)
}
