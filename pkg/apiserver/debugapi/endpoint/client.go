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

	"github.com/pingcap/tidb-dashboard/pkg/httpc"
)

// Dispatcher impl how to send requests
type Dispatcher interface {
	Send(req *Request) (*httpc.Response, error)
}

// APIModelWithMiddleware middlewares are used as validator and transformer
type APIModelWithMiddleware struct {
	*APIModel
	MiddlewareHub
}

func NewAPIModelWithMiddleware(endpoint *APIModel) *APIModelWithMiddleware {
	return &APIModelWithMiddleware{
		endpoint,
		*NewMiddlewareHub(),
	}
}

// AllMiddlewares includes endpoint middlewares & param model middlewares
func (m *APIModelWithMiddleware) AllMiddlewares() []MiddlewareHandler {
	middlewares := []MiddlewareHandler{}

	// param model middlewares
	m.ForEachParam(func(p *APIParam, isPathParam bool) error {
		modelMiddlewares := p.Model.GetMiddlewares(p, isPathParam)
		if len(modelMiddlewares) != 0 {
			middlewares = append(middlewares, modelMiddlewares...)
		}
		return nil
	})

	// endpoint middlewares
	middlewares = append(middlewares, m.Middlewares...)

	return middlewares
}

type Client struct {
	endpointMap  map[string]*APIModelWithMiddleware
	endpointList []APIModel
	dispatcher   Dispatcher
}

func NewClient(d Dispatcher) *Client {
	return &Client{endpointMap: map[string]*APIModelWithMiddleware{}, endpointList: []APIModel{}, dispatcher: d}
}

func (c *Client) Send(eID string, host string, port int, params map[string]string) (*httpc.Response, error) {
	endpoint, ok := c.endpointMap[eID]
	if !ok {
		return nil, fmt.Errorf("invalid endpoint id: %s", eID)
	}

	req := NewRequest(endpoint.Component, endpoint.Method, host, port, endpoint.Path)
	c.setValues(endpoint, params, req)

	if err := c.execMiddlewares(endpoint, req); err != nil {
		return nil, err
	}

	return c.dispatcher.Send(req)
}

func (c *Client) AddEndpoint(endpoint *APIModel, middlewares ...MiddlewareHandler) error {
	if c.endpointMap[endpoint.ID] != nil {
		return fmt.Errorf("duplicated endpoint: %s", endpoint.ID)
	}
	m := NewAPIModelWithMiddleware(endpoint)
	m.Use(middlewares...)
	c.endpointMap[endpoint.ID] = m
	c.endpointList = append(c.endpointList, *endpoint)
	return nil
}

func (c *Client) Endpoint(id string) *APIModel {
	return c.endpointMap[id].APIModel
}

func (c *Client) Endpoints() []APIModel {
	return c.endpointList
}

func (c *Client) setValues(endpoint *APIModelWithMiddleware, params map[string]string, req *Request) {
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
func (c *Client) execMiddlewares(m *APIModelWithMiddleware, req *Request) error {
	middlewares := []MiddlewareHandler{requiredMiddlewareAdapter(m.APIModel)}
	middlewares = append(middlewares, m.AllMiddlewares()...)
	for _, m := range middlewares {
		if m == nil {
			continue
		}
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
			if values.Get(p.Name) == "" {
				return fmt.Errorf("missing required param: %s", p.Name)
			} else {
				return nil
			}
		})
	})
}
