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

package profiling

import (
	"fmt"
	"net/http"
	"time"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/fetcher"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/tiflash"
	"github.com/pingcap/tidb-dashboard/pkg/tikv"
)

const (
	maxProfilingTimeout = time.Minute * 5
)

type clientMap map[model.NodeKind]fetcher.Client

func (fm *clientMap) Get(kind model.NodeKind) (fetcher.Client, error) {
	f, ok := (*fm)[kind]
	if !ok {
		return nil, fmt.Errorf("unsupported target %s", kind)
	}
	return f, nil
}

func newClientMap(
	tikvHTTPClient *tikv.Client,
	tiflashHTTPClient *tiflash.Client,
	tidbHTTPClient *tidb.Client,
	pdHTTPClient *pd.Client,
	config *config.Config,
) *clientMap {
	return &clientMap{
		model.NodeKindTiKV: &tikvClient{
			client: tikvHTTPClient,
		},
		model.NodeKindTiFlash: &tiflashClient{
			client: tiflashHTTPClient,
		},
		model.NodeKindTiDB: &tidbClient{
			client: tidbHTTPClient,
		},
		model.NodeKindPD: &pdClient{
			client:              pdHTTPClient,
			statusAPIHTTPScheme: config.GetClusterHTTPScheme(),
		},
	}
}

// tikv
var _ fetcher.Client = (*tikvClient)(nil)

type tikvClient struct {
	client *tikv.Client
}

func (f *tikvClient) Fetch(op *fetcher.ClientFetchOptions) ([]byte, error) {
	return f.client.WithTimeout(maxProfilingTimeout).SendGetRequest(op.IP, op.Port, op.Path)
}

// tiflash
var _ fetcher.Client = (*tiflashClient)(nil)

type tiflashClient struct {
	client *tiflash.Client
}

func (f *tiflashClient) Fetch(op *fetcher.ClientFetchOptions) ([]byte, error) {
	return f.client.WithTimeout(maxProfilingTimeout).SendGetRequest(op.IP, op.Port, op.Path)
}

// tidb
var _ fetcher.Client = (*tidbClient)(nil)

type tidbClient struct {
	client *tidb.Client
}

func (f *tidbClient) Fetch(op *fetcher.ClientFetchOptions) ([]byte, error) {
	return f.client.WithStatusAPIAddress(op.IP, op.Port).WithStatusAPITimeout(maxProfilingTimeout).SendGetRequest(op.Path)
}

// pd
var _ fetcher.Client = (*pdClient)(nil)

type pdClient struct {
	client              *pd.Client
	statusAPIHTTPScheme string
}

func (f *pdClient) Fetch(op *fetcher.ClientFetchOptions) ([]byte, error) {
	baseURL := fmt.Sprintf("%s://%s:%d", f.statusAPIHTTPScheme, op.IP, op.Port)
	f.client.WithBeforeRequest(func(req *http.Request) {
		req.Header.Add("PD-Allow-follower-handle", "true")
	})
	return f.client.WithTimeout(maxProfilingTimeout).WithBaseURL(baseURL).SendGetRequest(op.Path)
}
