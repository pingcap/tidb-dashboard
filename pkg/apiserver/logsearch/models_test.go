// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package logsearch

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestTaskGroupDeleteOnlyRemovesWithinConfiguredDirectory(t *testing.T) {
	gormDB, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "test.sqlite.db")))
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	db := &dbstore.DB{DB: gormDB}
	if err := autoMigrate(db); err != nil {
		t.Fatalf("migrate test database: %v", err)
	}

	root := filepath.Join(t.TempDir(), "logs")
	outsideDir := filepath.Join(t.TempDir(), "outside")
	if err := os.MkdirAll(outsideDir, 0o700); err != nil {
		t.Fatalf("create outside directory: %v", err)
	}
	outsideMarker := filepath.Join(outsideDir, "marker")
	if err := os.WriteFile(outsideMarker, []byte("keep"), 0o600); err != nil {
		t.Fatalf("create outside marker: %v", err)
	}

	outsideGroup := &TaskGroupModel{LogStoreDir: stringPointer(outsideDir)}
	if err := db.Create(outsideGroup).Error; err != nil {
		t.Fatalf("create outside task group: %v", err)
	}
	outsideGroup.Delete(db, root)
	if _, err := os.Stat(outsideMarker); err != nil {
		t.Fatalf("outside path was removed: %v", err)
	}

	managedDir := filepath.Join(root, "1")
	if err := os.MkdirAll(managedDir, 0o700); err != nil {
		t.Fatalf("create managed directory: %v", err)
	}
	managedGroup := &TaskGroupModel{LogStoreDir: stringPointer(managedDir)}
	if err := db.Create(managedGroup).Error; err != nil {
		t.Fatalf("create managed task group: %v", err)
	}
	managedGroup.Delete(db, root)
	if _, err := os.Stat(managedDir); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("managed path still exists or returned unexpected error: %v", err)
	}
}
