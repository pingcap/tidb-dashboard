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

type tagStruct struct {
	JSON    string   `tag:"json"`
	Agg     string   `tag:"agg"`
	Related []string `tag:"related"` // `related` tag is used to verify a non-existent column, which is aggregated from the columns represented by related.
}

func filterFieldsBy(obj interface{}, filterList []string, allowlist ...string) ([]string, error) {
	tagMap, err := utils.GetFieldTags(obj, tagStruct{})
	if err != nil {
		return nil, err
	}

	haveAllowlist := len(allowlist) != 0

	tagMap = tagMap.Filter(func(k string, v map[string]string) bool {
		haveRelatedColumns := v["Related"] != ""
		isColumnInFilterList := !haveRelatedColumns && isSubsets(filterList, []string{v["JSON"]})
		isRelatedColumnsInFilterList := haveRelatedColumns && isSubsets(filterList, strings.Split(v["Related"], ","))
		haveNotAllowlistOrIsJSONInAllowlist := !haveAllowlist || funk.Contains(allowlist, v["JSON"])
		// for readable, we should keep if/else
		if (isColumnInFilterList || isRelatedColumnsInFilterList) && haveNotAllowlistOrIsJSONInAllowlist {
			return true
		}

		return false
	})

	return funk.Map(tagMap, func(k string, v map[string]string) string {
		agg := v["Agg"]
		json := v["JSON"]
		if agg == "" {
			return json
		}
		columnName := gorm.ToColumnName(k)
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
