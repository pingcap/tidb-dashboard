// Copyright 2021 PingCAP, Inv.
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

type ResolvedValues struct {
	url.Values
	param *APIParam
}

func (v *ResolvedValues) Name() string {
	return v.param.Name
}

func (v *ResolvedValues) GetValue() string {
	return v.Values.Get(v.param.Name)
}

func (v *ResolvedValues) SetValue(val string) {
	v.Values.Set(v.param.Name, val)
}

func (v *ResolvedValues) GetValues() []string {
	return v.Values[v.param.Name]
}

func (v *ResolvedValues) SetValues(val []string) {
	v.Values[v.param.Name] = val
}

type ParamResolveFn func(v *ResolvedValues) error

type APIParamModel interface {
	Resolve(param *APIParam, value string) (*ResolvedValues, error)
}

type BaseAPIParamModel struct {
	Type      string         `json:"type"`
	OnResolve ParamResolveFn `json:"-"`
}

func (m *BaseAPIParamModel) Resolve(param *APIParam, value string) (*ResolvedValues, error) {
	resolvedValues := &ResolvedValues{
		Values: url.Values{param.Name: []string{value}},
		param:  param,
	}
	if m.OnResolve == nil {
		return resolvedValues, nil
	}

	if err := m.OnResolve(resolvedValues); err != nil {
		return nil, err
	}

	return resolvedValues, nil
}

type APIParam struct {
	Name     string `json:"name"`
	Required bool   `json:"required"`
	// represents what param is
	Model APIParamModel `json:"model" swaggertype:"object,string"`
}
