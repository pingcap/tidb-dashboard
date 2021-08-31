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
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package endpoint

import (
	"fmt"
	"net/url"

	"github.com/thoas/go-funk"

	"github.com/pingcap/tidb-dashboard/pkg/httpc"
)

// Fetcher impl how to send requests
type Fetcher interface {
	Fetch(req *Request) (*httpc.Response, error)
}

type Client struct {
	endpointMap  map[string]*APIModel
	endpointList []APIModel
	fetcher      Fetcher
}

func NewClient(fetcher Fetcher) *Client {
	return &Client{endpointMap: map[string]*APIModel{}, endpointList: []APIModel{}, fetcher: fetcher}
}

func (c *Client) Send(eID string, host string, port int, params map[string]string) (*httpc.Response, error) {
	endpoint, ok := c.endpointMap[eID]
	if !ok {
		return nil, fmt.Errorf("invalid endpoint id: %s", eID)
	}

	req := NewRequest(endpoint.Component, endpoint.Method, host, port, endpoint.Path)
	c.setValues(endpoint, params, req)

	ctx, err := c.execMiddlewares(endpoint, req)
	if err != nil {
		return nil, ErrInvalidParam.Wrap(err, "exec middleware error")
	}

	return ctx.Response, nil
}

func (c *Client) RegisterEndpoint(endpoints []*APIModel) *Client {
	for _, e := range endpoints {
		if c.endpointMap[e.ID] != nil {
			c.endpointList = funk.Filter(c.endpointList, func(item APIModel) bool {
				return item.ID != e.ID
			}).([]APIModel)
		}
		c.endpointMap[e.ID] = e
		c.endpointList = append(c.endpointList, *e)
	}
	return c
}

func (c *Client) Endpoint(id string) *APIModel {
	return c.endpointMap[id]
}

func (c *Client) Endpoints() []APIModel {
	return c.endpointList
}

func (c *Client) setValues(endpoint *APIModel, params map[string]string, req *Request) {
	for _, p := range endpoint.QueryParams {
		if params[p.Name] == "" {
			continue
		}
		req.QueryValues.Set(p.Name, params[p.Name])
	}
	for _, p := range endpoint.PathParams {
		if params[p.Name] == "" {
			continue
		}
		req.PathValues.Set(p.Name, params[p.Name])
	}
}

// before next: required validate middleware -> param model middlewares -> endpoint middlewares -> send request middleware
// after next: send request middleware -> endpoint middlewares -> param model middlewares -> required validate middleware
func (c *Client) execMiddlewares(m *APIModel, req *Request) (*Context, error) {
	middlewares := []MiddlewareHandler{requiredMiddlewareAdapter(m)}
	middlewares = append(middlewares, m.Middlewares()...)
	middlewares = append(middlewares, fetchMiddlewareAdapter(c.fetcher))

	ctx := newContext(req, middlewares)
	ctx.Next()
	if ctx.Error != nil {
		return nil, ctx.Error
	}

	return ctx, nil
}

// check all required params in endpoint
func requiredMiddlewareAdapter(endpoint *APIModel) MiddlewareHandler {
	return MiddlewareHandlerFunc(func(ctx *Context) {
		err := endpoint.ForEachParam(func(p *APIParam, isPathParam bool) error {
			var values url.Values
			if isPathParam {
				values = ctx.Request.PathValues
			} else {
				values = ctx.Request.QueryValues
			}
			if p.Required && values.Get(p.Name) == "" {
				return ErrInvalidParam.New("missing required param: %s", p.Name)
			}
			return nil
		})
		if err != nil {
			ctx.Abort(err)
			return
		}
		ctx.Next()
	})
}

func fetchMiddlewareAdapter(fetcher Fetcher) MiddlewareHandler {
	return MiddlewareHandlerFunc(func(ctx *Context) {
		res, err := fetcher.Fetch(ctx.Request)
		if err != nil {
			ctx.Abort(err)
			return
		}
		ctx.Response = res
		ctx.Next()
	})
}
