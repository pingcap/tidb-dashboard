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
	"time"

	"github.com/ReneKroon/ttlcache/v2"
	"github.com/jinzhu/gorm"
)

const (
	cachePrefix = "sys_schema"
	cacheTTL    = 1 * time.Minute
)

type SysSchema struct {
	ttl *ttlcache.Cache
}

func NewSysSchema() *SysSchema {
	ttl := ttlcache.NewCache()
	ttl.SkipTTLExtensionOnHit(true)
	return &SysSchema{
		ttl: ttl,
	}
}

func (c *SysSchema) GetTableColumnNames(db *gorm.DB, tableName string) ([]string, error) {
	key := fmt.Sprintf("%s_%s_tcn", cachePrefix, tableName)
	cnsCache, notExists := c.ttl.Get(key)
	if notExists == nil {
		return cnsCache.([]string), nil
	}

	cns := []string{}
	cs, err := c.GetTableColumns(db, tableName)
	if err != nil {
		return nil, err
	}

	for _, c := range cs {
		cns = append(cns, c.Field)
	}

	err = c.ttl.SetWithTTL(key, cns, cacheTTL)
	if err != nil {
		return nil, err
	}

	return cns, nil
}

type ColumnInfo struct {
	Field string `gorm:"column:Field" json:"field"`
}

func (c *SysSchema) GetTableColumns(db *gorm.DB, tableName string) ([]ColumnInfo, error) {
	key := fmt.Sprintf("%s_%s_tc", cachePrefix, tableName)
	csCache, notExists := c.ttl.Get(key)
	if notExists == nil {
		return csCache.([]ColumnInfo), nil
	}

	cs, err := fetchTableSchema(db, tableName)
	if err != nil {
		return nil, err
	}

	err = c.ttl.SetWithTTL(key, cs, cacheTTL)
	if err != nil {
		return nil, err
	}

	return cs, nil
}

func fetchTableSchema(db *gorm.DB, table string) ([]ColumnInfo, error) {
	var cs []ColumnInfo
	err := db.Raw(fmt.Sprintf("DESC %s", table)).Scan(&cs).Error
	if err != nil {
		return nil, err
	}

	return cs, nil
}
