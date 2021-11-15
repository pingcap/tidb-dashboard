// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package endpoint

import (
	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

// Process flow
//
// (send path/query params payload)
// browser side -|
//               |   (resolve request by api/param model OnResolve function)
//               |-> server side -|
//                                |   (the actual {host}:{port}/{path}?{query})
//                                |-> specific endpoint host

var (
	ErrNS = errorx.NewNamespace("error.api.debugapi.endpoint")
)

type APIResolveFn func(resolvedPayload *ResolvedRequestPayload) error

type APIModel struct {
	ID          string         `json:"id"`
	Component   model.NodeKind `json:"component"`
	Path        string         `json:"path"`
	Method      Method         `json:"method"`
	PathParams  []*APIParam    `json:"path_params"`  // e.g. /stats/dump/{db}/{table} -> db, table
	QueryParams []*APIParam    `json:"query_params"` // e.g. /debug/pprof?seconds=1 -> seconds
	OnResolve   APIResolveFn   `json:"-"`
}

func (m *APIModel) Resolve(resolvedPayload *ResolvedRequestPayload) error {
	if m.OnResolve == nil {
		return nil
	}
	return m.OnResolve(resolvedPayload)
}
