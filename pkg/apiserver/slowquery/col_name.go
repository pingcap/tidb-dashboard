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

type tagStruct struct {
	Gorm       string `tag:"gorm"`
	JSON       string `tag:"json"`
	Projection string `tag:"proj"`
}

func filterFieldsBy(obj interface{}, filterList []string, allowlist ...string) ([]string, error) {
	tagMap, err := utils.GetFieldTags(obj, tagStruct{})
	if err != nil {
		return nil, err
	}

	haveAllowlist := len(allowlist) != 0
	tagMap = tagMap.Filter(func(k string, v map[string]string) bool {
		isColumnInFilterList := funk.Contains(filterList, getGormColumnName(v["Gorm"]))
		haveProjection := v["Projection"] != ""
		haveNotAllowlistOrIsJSONInAllowlist := !haveAllowlist || funk.Contains(allowlist, v["JSON"])
		// for readable, we should keep if/else
		if (isColumnInFilterList || haveProjection) && haveNotAllowlistOrIsJSONInAllowlist {
			return true
		}

		return false
	})

	if err != nil {
		return nil, err
	}

	return funk.Map(tagMap, func(k string, v map[string]string) string {
		projection := v["Projection"]
		columnName := getGormColumnName(v["Gorm"])
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
