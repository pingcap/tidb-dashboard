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
	"regexp"

	"github.com/elazarl/goproxy"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/schema"
)

var (
	ErrEndpointConfig = ErrNS.NewType("invalid_endpoint_config")
	ErrRequestQuery   = ErrNS.NewType("invalid_request_query")
	ErrProxyRequest   = ErrNS.NewType("transform_proxy_request")
)

type proxy struct {
	server *goproxy.ProxyHttpServer
}

func newProxy() *proxy {
	p := &proxy{server: goproxy.NewProxyHttpServer()}
	return p
}

func (p *proxy) setupEndpoint(endpoint schema.EndpointAPI) {
	p.server.OnRequest(goproxy.DstHostIs(endpoint.ID)).DoFunc(func(req *http.Request, ctx *goproxy.ProxyCtx) (*http.Request, *http.Response) {
		qValues, err := url.ParseQuery(req.URL.RawQuery)
		if err != nil {
			fmt.Printf("%s", err.Error())
			return req, goproxy.NewResponse(req, goproxy.ContentTypeText, http.StatusBadRequest, ErrRequestQuery.New(req.URL.RawQuery).Error())
		}

		newReq, err := endpoint.NewRequest(qValues)
		if err != nil {
			fmt.Printf("%s", err.Error())
			return req, goproxy.NewResponse(req, goproxy.ContentTypeText, http.StatusBadRequest, ErrProxyRequest.WrapWithNoMessage(err).Error())
		}

		return newReq, nil
	})
	p.server.OnResponse(goproxy.UrlMatches(regexp.MustCompile("."))).DoFunc(func(resp *http.Response, ctx *goproxy.ProxyCtx) *http.Response {
		resp.Header.Add("Access-Control-Allow-Origin", "*")
		resp.Header.Set("Content-type", "application/json; charset=utf-8")
		return resp
	})
}

func (p *proxy) request(req *http.Request) (*http.Request, error) {
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
