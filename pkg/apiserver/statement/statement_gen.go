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

package statement

import (
	"fmt"
	"strings"

	"github.com/thoas/go-funk"
)

func (s *Service) genSelectStmt(tableColumns []string, reqFields []string) (string, error) {
	fields := getFieldsAndTags()

	// use reqFields filter when not all fields are requested
	if reqFields[0] != "*" {
		// "schema_name", "digest" for group, "sum_latency" for order
		reqFields = funk.UniqString(append(reqFields, "schema_name", "digest", "sum_latency"))
		fields = funk.Filter(fields, func(f Field) bool {
			return funk.Contains(reqFields, f.JSON)
		}).([]Field)
	}

	// filter by tableColumns
	fields = funk.Filter(fields, func(f Field) bool {
		haveRelatedColumns := f.Related != ""
		isValidTableColumn := !haveRelatedColumns && isSubsets(tableColumns, []string{f.JSON})
		isRelatedColumnsValid := haveRelatedColumns && isSubsets(tableColumns, strings.Split(f.Related, ","))
		return isValidTableColumn || isRelatedColumnsValid
	}).([]Field)

	stmt := funk.Map(fields, func(f Field) string {
		if f.Aggregation == "" {
			return f.JSON
		}
		return fmt.Sprintf("%s AS %s", f.Aggregation, f.ColumnName)
	}).([]string)
	return strings.Join(stmt, ", "), nil
}

func isSubsets(a []string, b []string) bool {
	lowercaseA := funk.Map(a, func(x string) string {
		return strings.ToLower(x)
	}).([]string)
	lowercaseB := funk.Map(b, func(x string) string {
		return strings.ToLower(x)
	}).([]string)

	return len(funk.Join(lowercaseA, lowercaseB, funk.InnerJoin).([]string)) == len(lowercaseB)
}
