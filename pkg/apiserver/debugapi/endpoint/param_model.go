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

type APIParamModel interface {
	Copy() APIParamModel
	PreTransformer(handler ModelTransformer) APIParamModel
	Transformer(handler ModelTransformer) APIParamModel
	PreTransform(ctx *Context) error
	Transform(ctx *Context) error
}

// ModelTransformer can transform the incoming param's value in special scenarios
// Also, now are used as validation function
type ModelTransformer func(ctx *Context) error

type BaseAPIParamModel struct {
	preTransformer ModelTransformer
	transformer    ModelTransformer

	Type string `json:"type"`
}

func NewAPIParamModel(t string) *BaseAPIParamModel {
	return &BaseAPIParamModel{Type: t}
}

func (m BaseAPIParamModel) Copy() APIParamModel {
	return &m
}

func (m *BaseAPIParamModel) PreTransformer(handler ModelTransformer) APIParamModel {
	m.preTransformer = handler
	return m
}

func (m *BaseAPIParamModel) Transformer(handler ModelTransformer) APIParamModel {
	m.transformer = handler
	return m
}

func (m *BaseAPIParamModel) PreTransform(ctx *Context) error {
	if m.preTransformer != nil {
		return m.preTransformer(ctx)
	}
	return nil
}

func (m *BaseAPIParamModel) Transform(ctx *Context) error {
	if m.transformer != nil {
		return m.transformer(ctx)
	}
	return nil
}
