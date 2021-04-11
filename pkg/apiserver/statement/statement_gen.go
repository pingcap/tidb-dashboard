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

func (s *Service) genSelectStmt(tableColumns []string, reqJSONColumns []string) (string, error) {
	fields := getFieldsAndTags()

	// use required fields filter when not all fields are requested
	if reqJSONColumns[0] != "*" {
		// "schema_name", "digest" for group, "sum_latency" for order
		requiredFields := funk.UniqString(append(reqJSONColumns, "schema_name", "digest", "sum_latency"))
		fields = funk.Filter(fields, func(f Field) bool {
			return funk.Contains(requiredFields, f.JSONName)
		}).([]Field)
	}

	// We have both TiDB 4.x and TiDB 5.x columns listed in the model. Filter out columns that do not exist in current version TiDB schema.
	fields = funk.Filter(fields, func(f Field) bool {
		hasRelatedColumns := len(f.Related) != 0
		isTableColumnValid := !hasRelatedColumns && isSubsets(tableColumns, []string{f.JSONName})
		isRelatedColumnsValid := hasRelatedColumns && isSubsets(tableColumns, f.Related)
		return isTableColumnValid || isRelatedColumnsValid
	}).([]Field)

	if len(fields) == 0 {
		return "", fmt.Errorf("unknown request columns: %q", reqJSONColumns)
	}

	stmt := funk.Map(fields, func(f Field) string {
		if f.Aggregation == "" {
			return f.JSONName
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
