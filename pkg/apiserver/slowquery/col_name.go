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
	"reflect"
	"strings"

	"github.com/thoas/go-funk"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
)

type fieldSchema struct {
	DBName     string
	JSON       string
	Projection string
}

func getFieldSchema() map[string]fieldSchema {
	fs := map[string]fieldSchema{}

	utils.ForEachField(SlowQuery{}, func(f reflect.StructField) {
		// ignore to check error because the field is defined by ourself
		// we can confirm that it has "gorm" tag and fixed structure
		gormField := f.Tag.Get("gorm")
		dbName := strings.Split(gormField, ":")[1]
		projection := f.Tag.Get("proj")
		json := strings.ToLower(f.Tag.Get("json"))
		fs[json] = fieldSchema{DBName: dbName, JSON: json, Projection: projection}
	})

	return fs
}

func filterFieldsBy(dbColumns []string, allowlist ...string) ([]string, error) {
	fs := map[string]fieldSchema{}
	originFs := getFieldSchema()
	haveAllowlist := len(allowlist) != 0

	for k, v := range originFs {
		// Filter the column when it is not in the table schema and there is no Projection tag
		if !funk.Contains(dbColumns, v.DBName) && v.Projection == "" {
			continue
		}

		if haveAllowlist && !funk.Contains(allowlist, k) {
			return nil, fmt.Errorf("unknown field %s", k)
		}

		fs[k] = v
	}

	return funk.Map(fs, func(k string, v fieldSchema) string {
		if v.Projection == "" {
			return v.DBName
		}
		return fmt.Sprintf("%s AS %s", v.Projection, v.DBName)
	}).([]string), nil
}
