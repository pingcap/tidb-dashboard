// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"context"
	"fmt"
	"time"

	"github.com/ReneKroon/ttlcache/v2"
	"go.uber.org/fx"
	"gorm.io/gorm"
)

const (
	cacheTTL = 1 * time.Minute
)

type SysSchema struct {
	cache *ttlcache.Cache
}

func ProvideSysSchema(lc fx.Lifecycle) *SysSchema {
	s := NewSysSchema()

	lc.Append(fx.Hook{
		OnStop: func(_ context.Context) error {
			return s.Close()
		},
	})

	return s
}

func NewSysSchema() *SysSchema {
	c := ttlcache.NewCache()
	c.SkipTTLExtensionOnHit(true)
	return &SysSchema{
		cache: c,
	}
}

func (c *SysSchema) Close() error {
	return c.cache.Close()
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
