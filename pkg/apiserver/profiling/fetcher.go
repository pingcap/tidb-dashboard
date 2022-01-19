// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"fmt"
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
		AddRequestHeader("PD-Allow-follower-handle", "true").
		SendGetRequest(op.path)
}
