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

package slowquery

import (
	"fmt"
	"strings"

	"github.com/thoas/go-funk"
)

func (s *Service) genSelectStmt(tableColumns []string, reqFields []string) string {
	fields := getFieldsAndTags()

	// use reqFields filter when not all fields are requested
	if reqFields[0] != "*" {
		// These three fields are the most basic information of a slow query record and should contain them
		reqFields = funk.UniqString(append(reqFields, "digest", "connection_id", "timestamp"))
		fields = funk.Filter(fields, func(f Field) bool {
			return funk.Contains(reqFields, f.JSON)
		}).([]Field)
	}

	// filter by tableColumns
	fields = funk.Filter(fields, func(f Field) bool {
		haveProjection := f.Projection != ""
		isValidTableColumn := funk.Contains(tableColumns, f.ColumnName)
		return haveProjection || isValidTableColumn
	}).([]Field)

	stmt := funk.Map(fields, func(f Field) string {
		if f.Projection == "" {
			return f.ColumnName
		}
		return fmt.Sprintf("%s AS %s", f.Projection, f.ColumnName)
	}).([]string)
	return strings.Join(stmt, ", ")
}

func (s *Service) genOrderStmt(orderBy string, isDesc bool) string {
	var order string
	// to handle the special case: timestamp
	// Order by column instead of expression, see related optimization in TiDB: https://github.com/pingcap/tidb/pull/20750
	if orderBy == "timestamp" {
		order = "Time"
	} else {
		fields := getFieldsAndTags()
		orderField := funk.Find(fields, func(f Field) bool {
			return f.JSON == orderBy
		}).(Field)
		order = orderField.ColumnName
	}

	if isDesc {
		order = fmt.Sprintf("%s DESC", order)
	} else {
		order = fmt.Sprintf("%s ASC", order)
	}

	return order
}
