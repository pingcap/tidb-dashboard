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

// Dispatcher impl how to send requests
type Dispatcher interface {
	Send(req *Request) (*httpc.Response, error)
}

type Client struct {
	endpointMap  map[string]*APIModel
	endpointList []APIModel
	dispatcher   Dispatcher
}

func NewClient(d Dispatcher) *Client {
	return &Client{endpointMap: map[string]*APIModel{}, endpointList: []APIModel{}, dispatcher: d}
}

func (c *Client) Send(eID string, host string, port int, params map[string]string) (*httpc.Response, error) {
	endpoint, ok := c.endpointMap[eID]
	if !ok {
		return nil, fmt.Errorf("invalid endpoint id: %s", eID)
	}

	req := NewRequest(endpoint.Component, endpoint.Method, host, port, endpoint.Path)
	c.setValues(endpoint, params, req)

	if err := c.execMiddlewares(endpoint, req); err != nil {
		return nil, ErrInvalidParam.Wrap(err, "exec middleware error")
	}

	return c.dispatcher.Send(req)
}

func (c *Client) AddEndpoint(endpoint *APIModel) *Client {
	if c.endpointMap[endpoint.ID] != nil {
		c.endpointList = funk.Filter(c.endpointList, func(e APIModel) bool {
			return e.ID != endpoint.ID
		}).([]APIModel)
	}
	c.endpointMap[endpoint.ID] = endpoint
	c.endpointList = append(c.endpointList, *endpoint)
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

// required validate middleware -> param model middlewares -> endpoint middlewares
func (c *Client) execMiddlewares(m *APIModel, req *Request) error {
	middlewares := []MiddlewareHandler{requiredMiddlewareAdapter(m)}
	middlewares = append(middlewares, m.Middlewares()...)
	for _, m := range middlewares {
		if err := m.Handle(req); err != nil {
			return err
		}
	}
	return nil
}

// check all required params in endpoint
func requiredMiddlewareAdapter(endpoint *APIModel) MiddlewareHandler {
	return MiddlewareHandlerFunc(func(req *Request) error {
		return endpoint.ForEachParam(func(p *APIParam, isPathParam bool) error {
			var values url.Values
			if isPathParam {
				values = req.PathValues
			} else {
				values = req.QueryValues
			}
			if p.Required && values.Get(p.Name) == "" {
				return ErrInvalidParam.New("missing required param: %s", p.Name)
			}
			return nil
		})
	})
}
