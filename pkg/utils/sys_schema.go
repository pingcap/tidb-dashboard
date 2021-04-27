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
	"context"
	"fmt"
	"time"

	"github.com/ReneKroon/ttlcache/v2"
	"github.com/jinzhu/gorm"
	"go.uber.org/fx"
)

const (
	cacheTTL = 1 * time.Minute
)

type SysSchema struct {
	cache *ttlcache.Cache
}

func NewSysSchema(lc fx.Lifecycle) *SysSchema {
	c := ttlcache.NewCache()
	c.SkipTTLExtensionOnHit(true)

	lc.Append(fx.Hook{
		OnStop: func(ctx context.Context) error {
			return c.Close()
		},
	})

	return &SysSchema{
		cache: c,
	}
}

func (c *SysSchema) GetTableColumnNames(db *gorm.DB, tableName string) ([]string, error) {
	cnsCache, _ := c.cache.Get(tableName)
	if cnsCache != nil {
		return cnsCache.([]string), nil
	}

	cns := []string{}
	cs, err := fetchTableSchema(db, tableName)
	if err != nil {
		return nil, err
	}

	for _, c := range cs {
		cns = append(cns, c.Field)
	}

	err = c.cache.SetWithTTL(tableName, cns, cacheTTL)
	if err != nil {
		return nil, err
	}

	return cns, nil
}

type columnInfo struct {
	Field string `gorm:"column:Field" json:"field"`
}

func fetchTableSchema(db *gorm.DB, table string) ([]columnInfo, error) {
	var cs []columnInfo
	err := db.Raw(fmt.Sprintf("DESC %s", table)).Scan(&cs).Error
	if err != nil {
		return nil, err
	}

	return cs, nil
}
