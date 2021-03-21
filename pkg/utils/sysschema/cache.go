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

package sysschema

import (
	"fmt"

	"github.com/jinzhu/gorm"
	"golang.org/x/sync/singleflight"
)

// TODO: use ttl based cache
type CacheService struct {
	singleflight.Group
	tableColumns     map[string][]ColumnInfo
	tableColumnNames map[string][]string
}

func NewCacheService() *CacheService {
	return &CacheService{
		tableColumns:     map[string][]ColumnInfo{},
		tableColumnNames: map[string][]string{},
	}
}

func (c *CacheService) GetTableColumnNames(db *gorm.DB, tableName string) ([]string, error) {
	key := fmt.Sprintf("%s_tcn", tableName)
	sharedValue, err, _ := c.Do(key, func() (interface{}, error) {
		cns, ok := c.tableColumnNames[tableName]
		if ok {
			return cns, nil
		}

		cs, err := c.GetTableColumns(db, tableName)
		if err != nil {
			return nil, err
		}

		for _, c := range cs {
			cns = append(cns, c.Field)
		}
		return cns, nil
	})
	return sharedValue.([]string), err
}

func (c *CacheService) GetTableColumns(db *gorm.DB, tableName string) ([]ColumnInfo, error) {
	key := fmt.Sprintf("%s_tc", tableName)
	sharedValue, err, _ := c.Do(key, func() (interface{}, error) {
		cs, ok := c.tableColumns[tableName]
		if ok {
			return cs, nil
		}

		cs, err := FetchTableSchema(db, tableName)
		if err != nil {
			return nil, err
		}
		c.tableColumns[tableName] = cs

		return cs, nil
	})
	return sharedValue.([]ColumnInfo), err
}
