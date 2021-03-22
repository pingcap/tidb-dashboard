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
	"time"

	"github.com/ReneKroon/ttlcache/v2"
	"github.com/jinzhu/gorm"
	"golang.org/x/sync/singleflight"
)

const (
	sysschemaCachePrefix = "sysschema_cache"
	commonTTL            = 1 * time.Minute
)

// TODO: use ttl based cache
type CacheService struct {
	singleflight.Group
	ttl *ttlcache.Cache
}

func NewCacheService() *CacheService {
	ttl := ttlcache.NewCache()
	ttl.SkipTTLExtensionOnHit(true)
	return &CacheService{
		ttl: ttl,
	}
}

func (c *CacheService) GetTableColumnNames(db *gorm.DB, tableName string) ([]string, error) {
	key := fmt.Sprintf("%s_%s_tcn", sysschemaCachePrefix, tableName)
	sharedValue, err, _ := c.Do(key, func() (interface{}, error) {
		cnsCache, notExists := c.ttl.Get(key)
		if notExists == nil {
			return cnsCache, nil
		}

		cns := []string{}
		cs, err := c.GetTableColumns(db, tableName)
		if err != nil {
			return nil, err
		}

		for _, c := range cs {
			cns = append(cns, c.Field)
		}

		err = c.ttl.SetWithTTL(key, cns, commonTTL)
		if err != nil {
			return nil, err
		}

		return cns, nil
	})
	return sharedValue.([]string), err
}

func (c *CacheService) GetTableColumns(db *gorm.DB, tableName string) ([]ColumnInfo, error) {
	key := fmt.Sprintf("%s_%s_tc", sysschemaCachePrefix, tableName)
	sharedValue, err, _ := c.Do(key, func() (interface{}, error) {
		csCache, notExists := c.ttl.Get(key)
		if notExists == nil {
			return csCache, nil
		}

		cs, err := FetchTableSchema(db, tableName)
		if err != nil {
			return nil, err
		}

		err = c.ttl.SetWithTTL(key, cs, commonTTL)
		if err != nil {
			return nil, err
		}

		return cs, nil
	})
	return sharedValue.([]ColumnInfo), err
}
