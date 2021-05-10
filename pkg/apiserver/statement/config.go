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

	"github.com/thoas/go-funk"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
)

// incoming configuration field should have the gorm tag `column` used to specify global variables
// sql will be built like this, gorm:"column:some_global_var" -> @@GLOBAL.some_global_var as some_global_var
func buildConfigQuerySQL(config interface{}) string {
	var configType reflect.Type
	if reflect.ValueOf(config).Kind() == reflect.Ptr {
		configType = reflect.TypeOf(config).Elem()
	} else {
		configType = reflect.TypeOf(config)
	}

	stmts := []string{}
	fNum := configType.NumField()
	for i := 0; i < fNum; i++ {
		f := configType.Field(i)
		gormTag, ok := f.Tag.Lookup("gorm")
		if !ok {
			continue
		}
		column := utils.GetGormColumnName(gormTag)
		stmts = append(stmts, fmt.Sprintf("@@GLOBAL.%s as %s", column, column))
	}

	// skip `SQL string formatting (gosec)` lint
	return "SELECT " + strings.Join(stmts, ",") // nolints
}

// sql will be built like this, gorm:"column:some_global_var" -> @@GLOBAL.some_global_var = some_global_var_value
func buildConfigUpdateSQL(config interface{}, extract ...string) string {
	var configType reflect.Type
	var configValue reflect.Value
	if reflect.ValueOf(config).Kind() == reflect.Ptr {
		configType = reflect.TypeOf(config).Elem()
		configValue = reflect.ValueOf(config).Elem()
	} else {
		configType = reflect.TypeOf(config)
		configValue = reflect.ValueOf(config)
	}

	stmts := []string{}
	fNum := configType.NumField()
	for i := 0; i < fNum; i++ {
		f := configType.Field(i)
		// extract fields on demand
		if len(extract) != 0 && !funk.ContainsString(extract, f.Name) {
			continue
		}
		gormTag, ok := f.Tag.Lookup("gorm")
		if !ok {
			continue
		}

		val := configValue.Field(i)
		column := utils.GetGormColumnName(gormTag)
		stmts = append(stmts, fmt.Sprintf("@@GLOBAL.%s = %v", column, val))
	}

	// skip `SQL string formatting (gosec)` lint
	return "SET " + strings.Join(stmts, ",") // nolints
}
