// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package dbstore

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/pingcap/log"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"moul.io/zapgorm2"
)

// NewMemoryDBStore creates an in-memory sqlite database. This is mostly useful in tests.
func NewMemoryDBStore() (*DB, error) {
	instanceID := uuid.New().String()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared&_busy_timeout=3000", instanceID)
	gormDB, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: zapgorm2.New(log.L()),
	})
	if err != nil {
		log.Error("Failed to open Dashboard storage file", zap.Error(err))
		return nil, err
	}
	sqliteDB, _ := gormDB.DB()
	sqliteDB.SetMaxOpenConns(1) // prevent "database table is locked" error

	db := &DB{gormDB}

	return db, nil
}

// MustNewMemoryStore creates an in-memory sqlite database.
// When the creation is failed, the program will be exited. It should only be used in tests.
func MustNewMemoryStore() *DB {
	db, err := NewMemoryDBStore()
	if err != nil {
		log.Fatal("Failed to create memory storage", zap.Error(err))
	}
	return db
}
