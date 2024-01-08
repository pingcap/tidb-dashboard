// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package statement

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/samber/lo"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
)

// incoming configuration field should have the gorm tag `column` used to specify global variables
// sql will be built like this,
// struct { FieldName `gorm:"column:some_global_var"` } -> @@GLOBAL.some_global_var AS some_global_var.
func buildGlobalConfigProjectionSelectSQL(config interface{}) string {
	str := buildStringByStructField(config, func(f reflect.StructField) (string, bool) {
		gormTag, ok := f.Tag.Lookup("gorm")
		if !ok {
			return "", false
		}
		column := utils.GetGormColumnName(gormTag)
		return fmt.Sprintf("@@GLOBAL.%s AS %s", column, column), true
	}, ", ")
	return "SELECT " + str // #nosec
}

// sql will be built like this,
// struct { FieldName `gorm:"column:some_global_var"` } -> @@GLOBAL.some_global_var = @FieldName
// `allowedFields` means only allowed fields can be kept in built SQL.
func buildGlobalConfigNamedArgsUpdateSQL(config interface{}, allowedFields ...string) string {
	str := buildStringByStructField(config, func(f reflect.StructField) (string, bool) {
		// extract fields on demand
		if len(allowedFields) != 0 && !lo.Contains(allowedFields, f.Name) {
			return "", false
		}

		gormTag, ok := f.Tag.Lookup("gorm")
		if !ok {
			return "", false
		}
		column := utils.GetGormColumnName(gormTag)
		return fmt.Sprintf("@@GLOBAL.%s = @%s", column, f.Name), true
	}, ", ")
	return "SET " + str // #nosec
}

func buildStringByStructField(i interface{}, buildFunc func(f reflect.StructField) (string, bool), sep string) string {
	var t reflect.Type
	if reflect.ValueOf(i).Kind() == reflect.Ptr {
		t = reflect.TypeOf(i).Elem()
	} else {
		t = reflect.TypeOf(i)
	}

	strs := []string{}
	fNum := t.NumField()
	for i := 0; i < fNum; i++ {
		str, ok := buildFunc(t.Field(i))
		if !ok {
			continue
		}
		strs = append(strs, str)
	}
	return strings.Join(strs, sep)
}
