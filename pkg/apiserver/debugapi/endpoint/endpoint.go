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
	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

var (
	ErrNS           = errorx.NewNamespace("error.api.debugapi.endpoint")
	ErrInvalidParam = ErrNS.NewType("invalid_parameter")
)

type APIModel struct {
	ID          string         `json:"id"`
	Component   model.NodeKind `json:"component"`
	Path        string         `json:"path"`
	Method      Method         `json:"method"`
	Ext         string         `json:"-"`            // response file ext
	PathParams  []*APIParam    `json:"path_params"`  // e.g. /stats/dump/{db}/{table} -> db, table
	QueryParams []*APIParam    `json:"query_params"` // e.g. /debug/pprof?seconds=1 -> seconds
}

func (m *APIModel) GetParams() []*APIParam {
	params := make([]*APIParam, len(m.PathParams)+len(m.QueryParams))
	if m.PathParams != nil {
		params = append(params, m.PathParams...)
	}
	if m.QueryParams != nil {
		params = append(params, m.QueryParams...)
	}
	return params
}
