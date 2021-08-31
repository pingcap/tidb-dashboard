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

import "net/url"

type APIParamModel interface {
	Copy() APIParamModel
	Use(handler ...ModelMiddlewareHandlerFunc) APIParamModel
	Middlewares(param *APIParam, isPathParam bool) []MiddlewareHandler
}

// ModelMiddlewareHandlerFunc can only get the value of the current param
type ModelMiddlewareHandlerFunc func(p *ModelParam, ctx *Context)

type BaseAPIParamModel struct {
	middlewares []ModelMiddlewareHandlerFunc

	Type string `json:"type"`
}

func NewAPIParamModel(t string) APIParamModel {
	return &BaseAPIParamModel{Type: t, middlewares: []ModelMiddlewareHandlerFunc{}}
}

func (m BaseAPIParamModel) Copy() APIParamModel {
	middlewares := m.middlewares
	m.middlewares = []ModelMiddlewareHandlerFunc{}
	m.middlewares = append(m.middlewares, middlewares...)
	return &m
}

func (m *BaseAPIParamModel) Use(handler ...ModelMiddlewareHandlerFunc) APIParamModel {
	m.middlewares = append(m.middlewares, handler...)
	return m
}

// Middlewares do some adapter works, that limit model middleware can only get the value of the current param
func (m *BaseAPIParamModel) Middlewares(param *APIParam, isPathParam bool) []MiddlewareHandler {
	middlewares := make([]MiddlewareHandler, 0, len(m.middlewares))
	for _, mi := range m.middlewares {
		middlewares = append(middlewares, MiddlewareHandlerFunc(func(ctx *Context) {
			var values url.Values
			if isPathParam {
				values = ctx.Request.PathValues
			} else {
				values = ctx.Request.QueryValues
			}
			mi(&ModelParam{values: values, param: param}, ctx)
		}))
	}
	return middlewares
}

type ModelParam struct {
	values url.Values
	param  *APIParam
}

func (mc *ModelParam) Name() string {
	return mc.param.Name
}

func (mc *ModelParam) Value() string {
	return mc.values.Get(mc.param.Name)
}

func (mc *ModelParam) SetValue(val string) {
	mc.values.Set(mc.param.Name, val)
}

func (mc *ModelParam) Values() []string {
	return mc.values[mc.param.Name]
}

func (mc *ModelParam) SetValues(val []string) {
	mc.values[mc.param.Name] = val
}

type APIParam struct {
	Name     string `json:"name"`
	Required bool   `json:"required"`
	// represents what param is
	Model APIParamModel `json:"model" swaggertype:"object,string"`
}
