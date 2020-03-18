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

	"github.com/jinzhu/gorm"
	// Sqlite3 driver used by gorm
	_ "github.com/jinzhu/gorm/dialects/sqlite"
	"github.com/pingcap/log"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

type DB struct {
	*gorm.DB
}

func NewDBStore(lc fx.Lifecycle, config *config.Config) (*DB, error) {
	if err := os.MkdirAll(config.DataDir, 0777); err != nil {
		log.Error("Failed to create Dashboard storage directory", zap.Error(err))
		return nil, err
	}

	gormDB, err := gorm.Open("sqlite3", path.Join(config.DataDir, "dashboard.sqlite.db"))
	if err != nil {
		log.Error("Failed to open Dashboard storage file", zap.Error(err))
		return nil, err
	}

	db := &DB{gormDB}

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			return db.Close()
		},
	})

	return db, nil
}
