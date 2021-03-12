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

package utils

import (
	"fmt"

	"github.com/jinzhu/gorm"
	"github.com/pingcap/tidb-dashboard/pkg/utils/schema"
)

var cachedTableColumnsMap map[string][]string

func GetTableColumns(tableName string) ([]string, error) {
	tcs, ok := cachedTableColumnsMap[tableName]
	if !ok {
		return nil, fmt.Errorf("table columns are not initialized")
	}
	return tcs, nil
}

func CacheTableColumns(db *gorm.DB, tableName string) ([]string, error) {
	cachedTcs, ok := cachedTableColumnsMap[tableName]
	if !ok {
		tcs, err := schema.FetchTableColumns(db, tableName)
		if err != nil {
			return nil, err
		}
		cachedTableColumnsMap[tableName] = tcs
	}

	return cachedTcs, nil
}
