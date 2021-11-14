// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

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
