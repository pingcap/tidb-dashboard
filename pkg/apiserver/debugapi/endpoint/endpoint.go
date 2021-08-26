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

package endpoint

import (
	"net/http"
	"net/url"
	"regexp"
	"time"

	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

var (
	ErrNS           = errorx.NewNamespace("error.api.debugapi.endpoint")
	ErrInvalidParam = ErrNS.NewType("invalid_parameter")
)

type UpdateRequestFunc func(req *Request, path Values, query Values, m *APIModel) error

type Request struct {
	Method  Method
	Timeout time.Duration
	Host    string
	Port    int
	Path    string
	Query   string
}

type Method string

const (
	MethodGet Method = http.MethodGet
)

type APIModel struct {
	ID                   string            `json:"id"`
	Component            model.NodeKind    `json:"component"`
	Path                 string            `json:"path"`
	Method               Method            `json:"method"`
	Ext                  string            `json:"-"`            // response file ext
	PathParams           []*APIParam       `json:"path_params"`  // e.g. /stats/dump/{db}/{table} -> db, table
	QueryParams          []*APIParam       `json:"query_params"` // e.g. /debug/pprof?seconds=1 -> seconds
	UpdateRequestHandler UpdateRequestFunc `json:"-"`
}

func (m *APIModel) NewRequest(host string, port int, data map[string]string) (*Request, error) {
	req := &Request{
		Method: m.Method,
		Host:   host,
		Port:   port,
	}

	pathValues, err := transformAndValidateParams(m.PathParams, data)
	if err != nil {
		return nil, err
	}
	if err := m.populatePath(req, pathValues); err != nil {
		return nil, err
	}

	queryValues, err := transformAndValidateParams(m.QueryParams, data)
	if err != nil {
		return nil, err
	}
	if err := m.encodeQuery(req, queryValues); err != nil {
		return nil, err
	}

	if m.UpdateRequestHandler != nil {
		if err := m.UpdateRequestHandler(req, pathValues, queryValues, m); err != nil {
			return nil, err
		}
	}

	return req, nil
}

var paramRegexp = regexp.MustCompile(`\{(\w+)\}`)

func (m *APIModel) populatePath(req *Request, values Values) error {
	var err error
	path := paramRegexp.ReplaceAllStringFunc(m.Path, func(s string) string {
		if err != nil {
			return s
		}
		key := paramRegexp.ReplaceAllString(s, "${1}")
		val := values.Get(key)
		return val
	})
	if err != nil {
		return err
	}
	req.Path = path
	return nil
}

func (m *APIModel) encodeQuery(req *Request, values Values) error {
	query := url.Values{}
	for _, q := range m.QueryParams {
		vals := values[q.Name]
		if len(vals) == 0 {
			continue
		}
		for _, val := range vals {
			query.Add(q.Name, val)
		}
	}

	req.Query = query.Encode()
	return nil
}

func transformAndValidateParams(params []*APIParam, data map[string]string) (Values, error) {
	return travelParamsWithValues(params, data, func(p *APIParam, ctx *Context) error {
		if err := p.Model.Transform(ctx); err != nil {
			return ErrInvalidParam.Wrap(err, "model transform error, param name: %s", p.Name)
		}
		if err := p.Transform(ctx); err != nil {
			return ErrInvalidParam.Wrap(err, "param transform error, param: %s", p.Name)
		}
		if err := p.Model.Validate(ctx); err != nil {
			return ErrInvalidParam.Wrap(err, "model validate error, param name: %s", p.Name)
		}
		if err := p.Validate(ctx); err != nil {
			return ErrInvalidParam.Wrap(err, "param validate error, param: %s", p.Name)
		}
		return nil
	})
}

func travelParamsWithValues(params []*APIParam, data map[string]string, cb func(p *APIParam, ctx *Context) error) (Values, error) {
	vs := Values{}
	for _, p := range params {
		if v, ok := data[p.Name]; ok {
			vs.Set(p.Name, v)
		}
	}

	for _, p := range params {
		ctx := &Context{
			ParamName:   p.Name,
			paramValues: vs,
		}
		if err := cb(p, ctx); err != nil {
			return nil, err
		}
	}

	return vs, nil
}
