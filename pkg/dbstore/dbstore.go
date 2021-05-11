// Copyright 2020 PingCAP, Inc.
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

package dbstore

import (
	"context"
	"os"
	"path"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"moul.io/zapgorm2"

	"github.com/pingcap/log"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/config"
)

type DB struct {
	*gorm.DB
}

func NewDBStore(lc fx.Lifecycle, config *config.Config) (*DB, error) {
	if err := os.MkdirAll(config.DataDir, 0777); err != nil {
		log.Error("Failed to create Dashboard storage directory", zap.Error(err))
		return nil, err
	}

	p := path.Join(config.DataDir, "dashboard.sqlite.db")
	log.Info("Dashboard initializing local storage file", zap.String("path", p))
	gormDB, err := gorm.Open(sqlite.Open(p), &gorm.Config{
		Logger: zapgorm2.New(log.L()),
	})
	if err != nil {
		log.Error("Failed to open Dashboard storage file", zap.Error(err))
		return nil, err
	}

	db := &DB{gormDB}

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			sqlDB, err := db.DB.DB()
			if err != nil {
				return err
			}
			return sqlDB.Close()
		},
	})

	return db, nil
}
