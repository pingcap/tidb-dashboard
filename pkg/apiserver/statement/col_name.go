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

	"github.com/jinzhu/gorm"
	"github.com/thoas/go-funk"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
)

func filterFieldsBy(obj interface{}, retainList []string, allowlist ...string) ([]string, error) {
	fieldTags := utils.GetFieldsAndTags(obj)
	haveAllowlist := len(allowlist) != 0
	fieldTags = funk.Filter(fieldTags, func(ft utils.FieldTags) bool {
		// `related` tag is used to verify a non-existent column, which is aggregated from the columns represented by related.
		haveRelatedColumns := ft.Tag("related") != ""
		isColumnInRetainList := !haveRelatedColumns && isSubsets(retainList, []string{ft.Tag("json")})
		isRelatedColumnsInRetainList := haveRelatedColumns && isSubsets(retainList, strings.Split(ft.Tag("related"), ","))
		noAllowListOrIsJSONInAllowList := !haveAllowlist || funk.Contains(allowlist, ft.Tag("json"))
		// for readable, we should keep if/else
		if (isColumnInRetainList || isRelatedColumnsInRetainList) && noAllowListOrIsJSONInAllowList {
			return true
		}

		return false
	}).([]utils.FieldTags)

	return funk.Map(fieldTags, func(ft utils.FieldTags) string {
		agg := ft.Tag("agg")
		json := ft.Tag("json")
		if agg == "" {
			return json
		}
		columnName := gorm.ToColumnName(ft.FieldName())
		return fmt.Sprintf("%s AS %s", agg, columnName)
	}).([]string), nil
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
