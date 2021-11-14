// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package endpoint

import (
	"net/http"
	"net/url"
	"regexp"
	"time"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
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
	apiModel *APIModel

	Host        string
	Port        int
	Component   model.NodeKind
	Method      Method
	Timeout     time.Duration
	PathParams  map[string]string
	QueryParams url.Values
}

var pathReplaceRegexp = regexp.MustCompile(`\{(\w+)\}`)

func (p *ResolvedRequestPayload) Path() string {
	path := pathReplaceRegexp.ReplaceAllStringFunc(p.apiModel.Path, func(s string) string {
		key := pathReplaceRegexp.ReplaceAllString(s, "${1}")
		val := p.PathParams[key]
		return val
	})
	return path
}

func (p *ResolvedRequestPayload) Query() string {
	return p.QueryParams.Encode()
}

type HTTPClient interface {
	Fetch(payload *ResolvedRequestPayload) (*httpc.Response, error)
}

type Client struct {
	apiMap     map[string]*APIModel
	apiList    []*APIModel
	httpClient HTTPClient
}

func NewClient(httpClient HTTPClient, models []*APIModel) *Client {
	apiMap := map[string]*APIModel{}
	for _, m := range models {
		apiMap[m.ID] = m
	}

	return &Client{apiMap: apiMap, apiList: models, httpClient: httpClient}
}

func (c *Client) Send(payload *RequestPayload) (*httpc.Response, error) {
	resolvedPayload, err := c.resolve(payload)
	if err != nil {
		return nil, err
	}

	return c.httpClient.Fetch(resolvedPayload)
}

func (c *Client) GetAllAPIModels() []*APIModel {
	return c.apiList
}

func (c *Client) resolve(payload *RequestPayload) (*ResolvedRequestPayload, error) {
	api, ok := c.apiMap[payload.EndpointID]
	if !ok {
		return nil, ErrInvalidParam.New("invalid endpoint id: %s", payload.EndpointID)
	}

	resolvedPayload := &ResolvedRequestPayload{
		apiModel:    api,
		Host:        payload.Host,
		Port:        payload.Port,
		Component:   api.Component,
		Method:      api.Method,
		PathParams:  map[string]string{},
		QueryParams: url.Values{},
	}

	// resolve param values by param model definitions
	for _, pathParam := range api.PathParams {
		// path param should always be required
		if payload.Params[pathParam.Name] == "" {
			return nil, ErrInvalidParam.New("missing required param: %s", pathParam.Name)
		}

		resolvedValue, err := pathParam.Model.Resolve(payload.Params[pathParam.Name])
		if err != nil {
			return nil, ErrInvalidParam.WrapWithNoMessage(err)
		}

		resolvedPayload.PathParams[pathParam.Name] = resolvedValue[0]
	}
	for _, queryParam := range api.QueryParams {
		if payload.Params[queryParam.Name] == "" {
			if queryParam.Required {
				return nil, ErrInvalidParam.New("missing required param: %s", queryParam.Name)
			}
			continue
		}

		resolvedValue, err := queryParam.Model.Resolve(payload.Params[queryParam.Name])
		if err != nil {
			return nil, ErrInvalidParam.WrapWithNoMessage(err)
		}

		resolvedPayload.QueryParams[queryParam.Name] = resolvedValue
	}

	// resolve param values by api model definitions
	if err := api.Resolve(resolvedPayload); err != nil {
		return nil, ErrInvalidParam.WrapWithNoMessage(err)
	}

	return resolvedPayload, nil
}
