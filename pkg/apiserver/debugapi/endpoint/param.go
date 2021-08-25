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

var (
	ErrMissingRequiredParam = ErrNS.NewType("missing_require_parameter")
)

type APIParamModel interface {
	AddTransformer(fun HookHandlerFunc) APIParamModel
	Transform(c *Context) error
	AddValidator(fun HookHandlerFunc) APIParamModel
	Validate(c *Context) error
}

// ModelTransformer can transform the incoming param's value in special scenarios
// Also, now are used as validation function
type ModelTransformer func(ctx *Context) error

type BaseAPIParamModel struct {
	transformer Hook
	validator   Hook

	Type string `json:"type"`
}

func NewAPIParamModel(t string) *BaseAPIParamModel {
	return &BaseAPIParamModel{Type: t}
}

func (m *BaseAPIParamModel) AddTransformer(fun HookHandlerFunc) APIParamModel {
	m.transformer.HandlerFunc(fun)
	return m
}

func (m *BaseAPIParamModel) Transform(ctx *Context) error {
	return m.transformer.Exec(ctx)
}

func (m *BaseAPIParamModel) AddValidator(fun HookHandlerFunc) APIParamModel {
	m.validator.HandlerFunc(fun)
	return m
}

func (m *BaseAPIParamModel) Validate(ctx *Context) error {
	return m.validator.Exec(ctx)
}

type APIParam struct {
	transformer Hook
	validator   Hook

	Name     string `json:"name"`
	Required bool   `json:"required"`
	// represents what param is
	Model APIParamModel `json:"model" swaggertype:"object,string"`
}

func NewAPIParam(model APIParamModel, name string, required bool) *APIParam {
	p := &APIParam{Name: name, Model: model, Required: required}
	if required {
		p.AddValidator(requiredValidator)
	}
	return p
}

func requiredValidator(c *Context) error {
	if c.Value() == "" {
		return ErrMissingRequiredParam.New("missing required param: %s", c.ParamName)
	}
	return nil
}

func (p *APIParam) AddTransformer(fun HookHandlerFunc) *APIParam {
	p.transformer.HandlerFunc(fun)
	return p
}

func (p *APIParam) Transform(ctx *Context) error {
	return p.transformer.Exec(ctx)
}

func (p *APIParam) AddValidator(fun HookHandlerFunc) *APIParam {
	p.validator.HandlerFunc(fun)
	return p
}

func (p *APIParam) Validate(ctx *Context) error {
	return p.validator.Exec(ctx)
}
