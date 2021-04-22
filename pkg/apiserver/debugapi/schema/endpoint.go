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

package schema

import (
	"fmt"
	"net/http"
	"net/url"
	"regexp"

	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

var (
	ErrNS = errorx.NewNamespace("error.api.debugapi.endpoint")
)

type EndpointAPI struct {
	ID        string                    `json:"id"`
	Component model.NodeKind            `json:"component"`
	Path      string                    `json:"path"`
	Method    string                    `json:"method"`
	Host      EndpointAPIParam          `json:"host"`
	Segment   []EndpointAPISegmentParam `json:"segment"` // e.g. /stats/dump/{db}/{table} -> db, table
	Query     []EndpointAPIParam        `json:"query"`   // e.g. /debug/pprof?seconds=1 -> seconds
}

func (e *EndpointAPI) NewRequest(values url.Values) (*http.Request, error) {
	host, err := e.PopulateHost(values)
	if err != nil {
		return nil, err
	}

	r, err := http.NewRequest(e.Method, host, nil)
	if err != nil {
		return nil, err
	}

	path, err := e.PopulatePath(values)
	if err != nil {
		return nil, err
	}
	r.URL.Path = path

	rawQuery, err := e.EncodeQuery(values)
	if err != nil {
		return nil, err
	}
	r.URL.RawQuery = rawQuery

	return r, nil
}

func (e *EndpointAPI) PopulateHost(values url.Values) (string, error) {
	host, err := e.Host.Value(values)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("http://%s", host), nil
}

func (e *EndpointAPI) PopulatePath(values url.Values) (string, error) {
	replacedPath := e.Path
	for _, s := range e.Segment {
		val, err := s.Value(values)
		if err != nil {
			return "", err
		}
		replacedPath = s.ReplaceAllString(replacedPath, val)
	}
	return replacedPath, nil
}

func (e *EndpointAPI) EncodeQuery(values url.Values) (string, error) {
	query := url.Values{}
	for _, q := range e.Query {
		val, err := q.Value(values)
		if err != nil {
			return "", err
		}
		query.Add(q.Name, val)
	}
	return query.Encode(), nil
}

type EndpointAPIParam struct {
	Name   string `json:"name"`
	Prefix string `json:"prefix"`
	Suffix string `json:"suffix"`
	// represents what param is
	Model                EndpointAPIModel                   `json:"model"`
	PreModelTransformer  func(value string) (string, error) `json:"-"`
	PostModelTransformer func(value string) (string, error) `json:"-"`
}

func (p *EndpointAPIParam) Value(values url.Values) (string, error) {
	return p.Transform(values.Get(p.Name))
}

func (p *EndpointAPIParam) Transform(value string) (string, error) {
	transfomers := []func(value string) (string, error){
		p.PreModelTransformer,
		p.Model.Transformer,
		p.PostModelTransformer,
	}

	for _, t := range transfomers {
		if t == nil {
			continue
		}
		v, err := t(value)
		if err != nil {
			return "", err
		}
		value = v
	}

	return value, nil
}

type EndpointAPISegmentParam struct {
	EndpointAPIParam
	reg *regexp.Regexp
}

func NewEndpointAPISegmentParam(p EndpointAPIParam) EndpointAPISegmentParam {
	return EndpointAPISegmentParam{
		EndpointAPIParam: p,
		reg:              regexp.MustCompile(fmt.Sprintf("{%s}", p.Name)),
	}
}

func (m *EndpointAPISegmentParam) ReplaceAllString(src string, repl string) string {
	return m.reg.ReplaceAllString(src, repl)
}
