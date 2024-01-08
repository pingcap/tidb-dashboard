// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import "gorm.io/gorm/schema"

func GetGormColumnName(gormStr string) string {
	gormStrMap := schema.ParseTagSetting(gormStr, ";")
	// The key will be converted to uppercase in:
	// https://github.com/go-gorm/gorm/blob/master/schema/utils.go#L33
	return gormStrMap["COLUMN"]
}
