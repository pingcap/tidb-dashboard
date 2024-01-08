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

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/config"
)

type DB struct {
	*gorm.DB
}

func NewDBStore(lc fx.Lifecycle, config *config.Config) (*DB, error) {
	err := os.MkdirAll(config.DataDir, 0o777) // #nosec
	if err != nil {
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
			return utils.CloseTiDBConnection(db.DB)
		},
	})

	return db, nil
}
