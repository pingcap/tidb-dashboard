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
	"reflect"
	"strings"

	"github.com/jinzhu/gorm"
	"github.com/thoas/go-funk"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
)

type fieldSchema struct {
	DBName  string
	JSON    string
	Agg     string
	Related []string
}

func getFieldSchema() map[string]fieldSchema {
	fs := map[string]fieldSchema{}

	utils.ForEachField(Model{}, func(f reflect.StructField) {
		agg, ok := f.Tag.Lookup("agg")
		if !ok {
			return
		}

		json := strings.ToLower(f.Tag.Get("json"))
		related := []string{json}
		rf, ok := f.Tag.Lookup("related")
		if ok {
			related = strings.Split(rf, ",")
		}

		fs[json] = fieldSchema{DBName: gorm.ToColumnName(f.Name), JSON: json, Agg: agg, Related: related}
	})

	return fs
}

func filterFieldsBy(dbColumns []string, allowlist ...string) ([]string, error) {
	fs := map[string]fieldSchema{}
	originFs := getFieldSchema()
	haveAllowlist := len(allowlist) != 0

	for k, v := range originFs {
		if !verifyRelatedFields(dbColumns, v.Related) {
			continue
		}

		if haveAllowlist && !funk.Contains(allowlist, k) {
			return nil, fmt.Errorf("unknown field %s", k)
		}

		fs[k] = v
	}

	return funk.Map(fs, func(k string, v fieldSchema) string {
		if v.Agg == "" {
			return v.JSON
		}
		return fmt.Sprintf("%s AS %s", v.Agg, v.DBName)
	}).([]string), nil
}

// Verify that the field associated with the aggregated field exists
func verifyRelatedFields(dbColumns []string, relatedFields []string) bool {
	lowercaseCs := []string{}
	for _, c := range dbColumns {
		lowercaseCs = append(lowercaseCs, strings.ToLower(c))
	}

	return len(funk.Join(lowercaseCs, relatedFields, funk.InnerJoin).([]string)) == len(relatedFields)
}
