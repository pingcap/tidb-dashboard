// Copyright 2021 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package fetcher

import (
	"fmt"
	"net/http"
	"time"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/tiflash"
	"github.com/pingcap/tidb-dashboard/pkg/tikv"
)

const (
	maxProfilingTimeout = time.Minute * 5
)

type ClientFetchOptions struct {
	IP   string
	Port int
	Path string
}

type ClientFetcher interface {
	Fetch(op *ClientFetchOptions) ([]byte, error)
}

type ProfileFetchOptions struct {
	Duration time.Duration
}

type ProfileFetcher interface {
	Fetch(op *ProfileFetchOptions) ([]byte, error)
}

type FetcherMap map[model.NodeKind]ClientFetcher

func (fm *FetcherMap) Get(kind model.NodeKind) (*ClientFetcher, error) {
	f, ok := (*fm)[kind]
	if !ok {
		return nil, fmt.Errorf("unsupported target %s", kind)
	}
	return &f, nil
}

func NewFetcherMap(
	tikvClient *tikv.Client,
	tidbClient *tidb.Client,
	pdClient *pd.Client,
	tiflashClient *tiflash.Client,
	config *config.Config,
) *FetcherMap {
	return &FetcherMap{
		model.NodeKindTiKV: &tikvFetcher{
			client: tikvClient,
		},
		model.NodeKindTiFlash: &tiflashFetcher{
			client: tiflashClient,
		},
		model.NodeKindTiDB: &tidbFetcher{
			client: tidbClient,
		},
		model.NodeKindPD: &pdFetcher{
			client:              pdClient,
			statusAPIHTTPScheme: config.GetClusterHTTPScheme(),
		},
	}
}

type tikvFetcher struct {
	client *tikv.Client
}

func (f *tikvFetcher) Fetch(op *ClientFetchOptions) ([]byte, error) {
	return f.client.WithTimeout(maxProfilingTimeout).SendGetRequest(op.IP, op.Port, op.Path)
}

type tiflashFetcher struct {
	client *tiflash.Client
}

func (f *tiflashFetcher) Fetch(op *ClientFetchOptions) ([]byte, error) {
	return f.client.WithTimeout(maxProfilingTimeout).SendGetRequest(op.IP, op.Port, op.Path)
}

type tidbFetcher struct {
	client *tidb.Client
}

func (f *tidbFetcher) Fetch(op *ClientFetchOptions) ([]byte, error) {
	return f.client.WithStatusAPIAddress(op.IP, op.Port).WithStatusAPITimeout(maxProfilingTimeout).SendGetRequest(op.Path)
}

type pdFetcher struct {
	client              *pd.Client
	statusAPIHTTPScheme string
}

func (f *pdFetcher) Fetch(op *ClientFetchOptions) ([]byte, error) {
	baseURL := fmt.Sprintf("%s://%s:%d", f.statusAPIHTTPScheme, op.IP, op.Port)
	f.client.WithBeforeRequest(func(req *http.Request) {
		req.Header.Add("PD-Allow-follower-handle", "true")
	})
	return f.client.WithTimeout(maxProfilingTimeout).WithBaseURL(baseURL).SendGetRequest(op.Path)
}
