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
	"net/http"
	"net/url"
	"regexp"
	"time"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
	"github.com/thoas/go-funk"
)

var (
	ErrInvalidParam = ErrNS.NewType("invalid_parameter")
)

type RequestPayload struct {
	EndpointID string            `json:"id"`
	Host       string            `json:"host"`
	Port       int               `json:"port"`
	Params     map[string]string `json:"params"`
}

type Method string

const (
	MethodGet Method = http.MethodGet
)

type ResolvedRequestPayload struct {
	originalPayload *RequestPayload
	pathSchema      string

	Host        string
	Port        int
	Component   model.NodeKind
	Method      Method
	Header      http.Header
	Timeout     time.Duration
	PathParams  map[string]string
	QueryParams url.Values
}

var pathReplaceRegexp = regexp.MustCompile(`\{(\w+)\}`)

func (p *ResolvedRequestPayload) Path() string {
	path := pathReplaceRegexp.ReplaceAllStringFunc(p.pathSchema, func(s string) string {
		key := pathReplaceRegexp.ReplaceAllString(s, "${1}")
		val := p.PathParams[key]
		return val
	})
	return path
}

func (p *ResolvedRequestPayload) Query() string {
	return p.QueryParams.Encode()
}

// Fetcher impl how to send requests
type Fetcher interface {
	Fetch(payload *ResolvedRequestPayload) (*httpc.Response, error)
}

type Client struct {
	apiMap  map[string]*APIModel
	apiList []*APIModel
	fetcher Fetcher
}

func NewClient(fetcher Fetcher, models []*APIModel) *Client {
	apiMap := map[string]*APIModel{}
	for _, m := range models {
		apiMap[m.ID] = m
	}

	return &Client{apiMap: apiMap, apiList: models, fetcher: fetcher}
}

func (c *Client) Send(payload *RequestPayload) (*httpc.Response, error) {
	resolvedPayload, err := c.resolve(payload)
	if err != nil {
		return nil, err
	}

	return c.fetcher.Fetch(resolvedPayload)
}

func (c *Client) GetAPIModel(id string) *APIModel {
	return c.apiMap[id]
}

func (c *Client) GetAllAPIModels() []APIModel {
	return funk.Map(c.apiList, func(m *APIModel) APIModel {
		return *m
	}).([]APIModel)
}

func (c *Client) resolve(payload *RequestPayload) (*ResolvedRequestPayload, error) {
	api, ok := c.apiMap[payload.EndpointID]
	if !ok {
		return nil, fmt.Errorf("invalid endpoint id: %s", payload.EndpointID)
	}

	resolvedPayload := &ResolvedRequestPayload{
		originalPayload: payload,
		pathSchema:      api.Path,
		Host:            payload.Host,
		Port:            payload.Port,
		Component:       api.Component,
		Method:          api.Method,
		PathParams:      map[string]string{},
		QueryParams:     url.Values{},
	}

	// resolve param values by api/param model definition
	err := api.ForEachParam(func(param *APIParam, isPathParam bool) error {
		if payload.Params[param.Name] == "" {
			if param.Required {
				return fmt.Errorf("missing required param: %s", param.Name)
			}
			return nil
		}

		resolvedValues, err := param.Model.Resolve(param, payload.Params[param.Name])
		if err != nil {
			return err
		}

		if isPathParam {
			resolvedPayload.PathParams[param.Name] = resolvedValues.Get(param.Name)
		} else {
			resolvedPayload.QueryParams[param.Name] = resolvedValues.Values[param.Name]
		}
		return nil
	})
	if err != nil {
		return nil, ErrInvalidParam.WrapWithNoMessage(err)
	}

	api.Resolve(resolvedPayload)

	return resolvedPayload, nil
}
