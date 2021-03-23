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

type Client interface {
	Fetch(op *ClientFetchOptions) ([]byte, error)
}

type ClientMap map[model.NodeKind]Client

func (fm *ClientMap) Get(kind model.NodeKind) (Client, error) {
	f, ok := (*fm)[kind]
	if !ok {
		return nil, fmt.Errorf("unsupported target %s", kind)
	}
	return f, nil
}

func NewClientMap(
	tikvHttpClient *tikv.Client,
	tiflashHttpClient *tiflash.Client,
	tidbHttpClient *tidb.Client,
	pdHttpClient *pd.Client,
	config *config.Config,
) *ClientMap {
	return &ClientMap{
		model.NodeKindTiKV: &tikvClient{
			client: tikvHttpClient,
		},
		model.NodeKindTiFlash: &tiflashClient{
			client: tiflashHttpClient,
		},
		model.NodeKindTiDB: &tidbClient{
			client: tidbHttpClient,
		},
		model.NodeKindPD: &pdClient{
			client:              pdHttpClient,
			statusAPIHTTPScheme: config.GetClusterHTTPScheme(),
		},
	}
}

type tikvClient struct {
	client *tikv.Client
}

func (f *tikvClient) Fetch(op *ClientFetchOptions) ([]byte, error) {
	return f.client.WithTimeout(maxProfilingTimeout).SendGetRequest(op.IP, op.Port, op.Path)
}

type tiflashClient struct {
	client *tiflash.Client
}

func (f *tiflashClient) Fetch(op *ClientFetchOptions) ([]byte, error) {
	return f.client.WithTimeout(maxProfilingTimeout).SendGetRequest(op.IP, op.Port, op.Path)
}

type tidbClient struct {
	client *tidb.Client
}

func (f *tidbClient) Fetch(op *ClientFetchOptions) ([]byte, error) {
	return f.client.WithStatusAPIAddress(op.IP, op.Port).WithStatusAPITimeout(maxProfilingTimeout).SendGetRequest(op.Path)
}

type pdClient struct {
	client              *pd.Client
	statusAPIHTTPScheme string
}

func (f *pdClient) Fetch(op *ClientFetchOptions) ([]byte, error) {
	baseURL := fmt.Sprintf("%s://%s:%d", f.statusAPIHTTPScheme, op.IP, op.Port)
	f.client.WithBeforeRequest(func(req *http.Request) {
		req.Header.Add("PD-Allow-follower-handle", "true")
	})
	return f.client.WithTimeout(maxProfilingTimeout).WithBaseURL(baseURL).SendGetRequest(op.Path)
}
