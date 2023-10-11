// Copyright 2023 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	_ "embed"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"go.uber.org/fx"

	"github.com/pkg/errors"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/tiflash"
	"github.com/pingcap/tidb-dashboard/pkg/tikv"
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
	tikv    profileFetcher
	tiflash profileFetcher
	tidb    profileFetcher
	pd      profileFetcher
}

var newFetchers = fx.Provide(func(
	tikvClient *tikv.Client,
	tidbClient *tidb.Client,
	pdClient *pd.Client,
	tiflashClient *tiflash.Client,
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
	}
})

type tikvFetcher struct {
	client *tikv.Client
}

//go:embed jeprof.in
var jeprof string

func (f *tikvFetcher) fetch(op *fetchOptions) ([]byte, error) {
	if strings.HasSuffix(op.path, "heap") {
		cmd := exec.Command("perl", "/dev/stdin", "--raw", "http://"+op.ip+":"+strconv.Itoa(op.port)+op.path) //nolint:gosec
		cmd.Stdin = strings.NewReader(jeprof)
		// use jeprof to fetch tikv heap profile
		data, err := cmd.Output()
		if err != nil {
			return nil, errors.Errorf("failed to fetch tikv heap profile: %s", err)
		}
		return data, nil
	}
	return f.client.WithTimeout(maxProfilingTimeout).AddRequestHeader("Content-Type", "application/protobuf").SendGetRequest(op.ip, op.port, op.path)
}

type tiflashFetcher struct {
	client *tiflash.Client
}

func (f *tiflashFetcher) fetch(op *fetchOptions) ([]byte, error) {
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
	baseURL := fmt.Sprintf("%s://%s:%d", f.statusAPIHTTPScheme, op.ip, op.port)
	return f.client.
		WithTimeout(maxProfilingTimeout).
		WithBaseURL(baseURL).
		WithoutPrefix(). // pprof API does not have /pd/api/v1 prefix
		SendGetRequest(op.path)
}
