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
	"net/url"

	"github.com/elazarl/goproxy"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/schema"
)

var (
	ErrEndpointConfig = ErrNS.NewType("invalid_endpoint_config")
	ErrQueryValue     = ErrNS.NewType("invalid_query_value")
	ErrRequestParam   = ErrNS.NewType("invalid_request_param")
)

type proxy struct {
	Server *goproxy.ProxyHttpServer
}

func newProxy() *proxy {
	proxyServer := goproxy.NewProxyHttpServer()
	proxyServer.KeepDestinationHeaders = true
	return &proxy{Server: proxyServer}
}

func (p *proxy) SetupEndpoint(endpoint schema.EndpointAPI) {
	p.Server.OnRequest(goproxy.DstHostIs(endpoint.ID)).DoFunc(func(req *http.Request, ctx *goproxy.ProxyCtx) (*http.Request, *http.Response) {
		qValues, err := url.ParseQuery(req.URL.RawQuery)
		if err != nil {
			return req, goproxy.NewResponse(req, goproxy.ContentTypeText, http.StatusBadRequest, ErrQueryValue.New(req.URL.RawQuery).Error())
		}

		// because of the strange impl of goproxy:
		// https://github.com/elazarl/goproxy/blob/master/proxy.go#L62
		// https://github.com/elazarl/goproxy/blob/master/dispatcher.go#L213
		// we need to update URL in the previous response reference instead of return a new response
		err = endpoint.Populate(req, qValues)
		if err != nil {
			return req, goproxy.NewResponse(req, goproxy.ContentTypeText, http.StatusBadRequest, ErrRequestParam.WrapWithNoMessage(err).Error())
		}

		return req, nil
	})
}

func (p *proxy) Request(req *http.Request) (*http.Request, error) {
	proxyID := req.URL.Query().Get("id")
	if proxyID == "" {
		return nil, ErrEndpointConfig.New("invalid proxy id: %s", proxyID)
	}

	url := fmt.Sprintf("http://%s", proxyID)
	proxyReq, _ := http.NewRequest(http.MethodGet, url, nil)
	// request query contains both values of path params: /stats/dump/{db}/{table} -> db, table
	// and queries: /debug/pprof?seconds=1 -> seconds
	proxyReq.URL.RawQuery = req.URL.RawQuery

	return proxyReq, nil
}
