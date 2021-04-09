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

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
)

func filterFieldsBy(obj interface{}, retainList []string, allowlist ...string) ([]string, error) {
	fieldTags := utils.GetFieldsAndTags(obj)
	haveAllowlist := len(allowlist) != 0
	fieldTags = funk.Filter(fieldTags, func(ft utils.FieldTags) bool {
		isColumnInRetainList := funk.Contains(retainList, getGormColumnName(ft.Tag("gorm")))
		haveProjection := ft.Tag("projection") != ""
		noAllowListOrIsJSONInAllowList := !haveAllowlist || funk.Contains(allowlist, ft.Tag("json"))
		// for readable, we should keep if/else
		if (isColumnInRetainList || haveProjection) && noAllowListOrIsJSONInAllowList {
			return true
		}

		return false
	}).([]utils.FieldTags)

	return funk.Map(fieldTags, func(ft utils.FieldTags) string {
		projection := ft.Tag("proj")
		columnName := getGormColumnName(ft.Tag("gorm"))
		if projection == "" {
			return columnName
		}
		return fmt.Sprintf("%s AS %s", projection, columnName)
	}).([]string), nil
}

func getGormColumnName(gormStr string) string {
	// TODO: use go-gorm/gorm/schema ParseTagSetting. Prerequisite: Upgrade to the latest version
	columnName := strings.Split(gormStr, ":")[1]
	return columnName
}
