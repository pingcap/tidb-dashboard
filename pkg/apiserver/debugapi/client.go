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

package debugapi

import (
	"fmt"
	"net/http"
	"time"

	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/endpoint"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/tiflash"
	"github.com/pingcap/tidb-dashboard/pkg/tikv"
)

const (
	defaultTimeout = time.Second * 45 // Default profiling can be as long as 30s.
)

type Client interface {
	Get(request *endpoint.Request) (*http.Response, error)
}

type ClientMap map[model.NodeKind]Client

func newClientMap(tidbImpl tidbImplement, tikvImpl tikvImplement, tiflashImpl tiflashImplement, pdImpl pdImplement) *ClientMap {
	clientMap := ClientMap{
		model.NodeKindTiDB:    &tidbImpl,
		model.NodeKindTiKV:    &tikvImpl,
		model.NodeKindTiFlash: &tiflashImpl,
		model.NodeKindPD:      &pdImpl,
	}
	return &clientMap
}

func SendRequest(client Client, req *endpoint.Request) (*http.Response, error) {
	switch req.Method {
	case endpoint.MethodGet:
		return client.Get(req)
	default:
		return nil, fmt.Errorf("invalid request method `%s`, host: %s, path: %s", req.Method, req.Host, req.Path)
	}
}

type tidbImplement struct {
	fx.In
	Client *tidb.Client
}

func (impl *tidbImplement) Get(req *endpoint.Request) (*http.Response, error) {
	resp, err := impl.Client.NewStatusAPIClientWithEnforceHost(fmt.Sprintf("%s:%d", req.Host, req.Port)).
		// prevent closing body by resty. https://github.com/go-resty/resty/issues/369
		SetDoNotParseResponse(true).
		SetTimeout(defaultTimeout).
		R().
		SetQueryString(req.Query).
		Get(req.Path)
	if err != nil {
		return nil, err
	}
	return resp.RawResponse, nil
}

type tikvImplement struct {
	fx.In
	Client *tikv.Client
}

func (impl *tikvImplement) Get(req *endpoint.Request) (*http.Response, error) {
	resp, err := impl.Client.NewClientWithHost(fmt.Sprintf("%s:%d", req.Host, req.Port)).
		SetDoNotParseResponse(true).
		SetTimeout(defaultTimeout).
		R().
		SetQueryString(req.Query).
		Get(req.Path)
	if err != nil {
		return nil, err
	}
	return resp.RawResponse, nil
}

type tiflashImplement struct {
	fx.In
	Client *tiflash.Client
}

func (impl *tiflashImplement) Get(req *endpoint.Request) (*http.Response, error) {
	resp, err := impl.Client.NewClientWithHost(fmt.Sprintf("%s:%d", req.Host, req.Port)).
		SetDoNotParseResponse(true).
		SetTimeout(defaultTimeout).
		R().
		SetQueryString(req.Query).
		Get(req.Path)
	if err != nil {
		return nil, err
	}
	return resp.RawResponse, nil
}

type pdImplement struct {
	fx.In
	Client *pd.Client
}

func (impl *pdImplement) Get(req *endpoint.Request) (*http.Response, error) {
	resp, err := impl.Client.NewClientWithHost(fmt.Sprintf("%s:%d", req.Host, req.Port)).
		SetDoNotParseResponse(true).
		SetTimeout(defaultTimeout).
		R().
		SetHeader("PD-Allow-follower-handle", "true").
		SetQueryString(req.Query).
		Get(req.Path)
	if err != nil {
		return nil, err
	}
	return resp.RawResponse, nil
}
