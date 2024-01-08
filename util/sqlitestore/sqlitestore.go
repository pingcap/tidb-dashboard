// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package dbstore

import (
	"context"
	"os"
	"path"

	"github.com/pingcap/log"
	"go.uber.org/fx"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"moul.io/zapgorm2"
)

type SqliteDB struct {
	*gorm.DB
}

type Config struct {
	DbFilePath string
}

// NewSqliteStore creates a new SQLite storage. When lifecycle is ended, the storage will be closed.
func NewSqliteStore(lc fx.Lifecycle, config Config) (*SqliteDB, error) {
	dataDir := path.Dir(config.DbFilePath)

	err := os.MkdirAll(dataDir, 0o700)
	if err != nil {
		log.Error("Failed to create Dashboard storage directory", zap.Error(err))
		return nil, err
	}

	log.Info("Dashboard initializing local storage file", zap.String("path", config.DbFilePath))
	gormDB, err := gorm.Open(sqlite.Open(config.DbFilePath), &gorm.Config{
		Logger: zapgorm2.New(log.L()),
	})
	if err != nil {
		log.Error("Failed to open Dashboard storage file", zap.Error(err))
		return nil, err
	}

	db := &SqliteDB{gormDB}

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
