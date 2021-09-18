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

type ParamResolveFn func(value string) ([]string, error)

type APIParamModel interface {
	Resolve(value string) ([]string, error)
}

type BaseAPIParamModel struct {
	Type      string         `json:"type"`
	OnResolve ParamResolveFn `json:"-"`
}

func (m *BaseAPIParamModel) Resolve(value string) ([]string, error) {
	if m.OnResolve == nil {
		return []string{value}, nil
	}
	return m.OnResolve(value)
}

type APIParam struct {
	Name     string `json:"name"`
	Required bool   `json:"required"`
	// represents what param is
	Model APIParamModel `json:"model" swaggertype:"object,string"`
}
