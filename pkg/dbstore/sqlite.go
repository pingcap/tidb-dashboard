// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package dbstore

import (
	"os"
	"path"

	"github.com/pingcap/log"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"moul.io/zapgorm2"
)

// TODO: Move this to internal util when it is flexible enough.

type DB struct {
	*gorm.DB
}

func NewDBStore(dataDir string) (*DB, error) {
	err := os.MkdirAll(dataDir, 0o777) // #nosec
	if err != nil {
		log.Error("Failed to create Dashboard storage directory", zap.Error(err))
		return nil, err
	}

	p := path.Join(dataDir, "dashboard.sqlite.db")
	log.Info("Dashboard initializing local storage file", zap.String("path", p))
	gormDB, err := gorm.Open(sqlite.Open(p), &gorm.Config{
		Logger: zapgorm2.New(log.L()),
	})
	if err != nil {
		log.Error("Failed to open Dashboard storage file", zap.Error(err))
		return nil, err
	}

	db := &DB{gormDB}

	return db, nil
}

func (db *DB) Close() error {
	sqlDB, err := db.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// MustClose closes the database and panics if close failed.
// It should only be used in tests.
func (db *DB) MustClose() {
	err := db.Close()
	if err != nil {
		log.Fatal("Close db failed", zap.Error(err))
	}
}
