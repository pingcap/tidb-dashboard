// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"fmt"
	"net/http"
	"time"

	"go.uber.org/fx"

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

func (f *tikvFetcher) fetch(op *fetchOptions) ([]byte, error) {
	resp, err := f.client.WithTimeout(maxProfilingTimeout).Get(op.ip, op.port, op.path)
	if err != nil {
		return nil, err
	}
	return resp.Body(), nil
}

type tiflashFetcher struct {
	client *tiflash.Client
}

func (f *tiflashFetcher) fetch(op *fetchOptions) ([]byte, error) {
	resp, err := f.client.WithTimeout(maxProfilingTimeout).Get(op.ip, op.port, op.path)
	if err != nil {
		return nil, err
	}
	return resp.Body(), nil
}

type tidbFetcher struct {
	client *tidb.Client
}

func (f *tidbFetcher) fetch(op *fetchOptions) ([]byte, error) {
	resp, err := f.client.WithStatusAPIAddress(op.ip, op.port).WithStatusAPITimeout(maxProfilingTimeout).Get(op.path)
	if err != nil {
		return nil, err
	}
	return resp.Body(), nil
}

type pdFetcher struct {
	client              *pd.Client
	statusAPIHTTPScheme string
}

func (f *pdFetcher) fetch(op *fetchOptions) ([]byte, error) {
	baseURL := fmt.Sprintf("%s://%s:%d", f.statusAPIHTTPScheme, op.ip, op.port)
	f.client.WithBeforeRequest(func(req *http.Request) {
		req.Header.Add("PD-Allow-follower-handle", "true")
	})
	resp, err := f.client.WithTimeout(maxProfilingTimeout).WithBaseURL(baseURL).Get(op.path)
	if err != nil {
		return nil, err
	}
	return resp.Body(), nil
}
