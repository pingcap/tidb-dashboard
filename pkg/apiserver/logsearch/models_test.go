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

	outsideTaskPath := filepath.Join(outsideDir, "task-1.zip")
	if err := os.WriteFile(outsideTaskPath, []byte("keep"), 0o600); err != nil {
		t.Fatalf("create outside task file: %v", err)
	}
	outsideTask := &TaskModel{LogStorePath: stringPointer(outsideTaskPath)}
	outsideTask.RemoveDataAndPreview(db, root, stringPointer(outsideDir))
	if _, err := os.Stat(outsideTaskPath); err != nil {
		t.Fatalf("outside task path was removed: %v", err)
	}
	if outsideTask.LogStorePath != nil {
		t.Fatal("outside task path was not cleared from the model")
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

	rootGroupMarker := filepath.Join(root, "root-marker")
	if err := os.MkdirAll(root, 0o700); err != nil {
		t.Fatalf("create root directory: %v", err)
	}
	if err := os.WriteFile(rootGroupMarker, []byte("keep"), 0o600); err != nil {
		t.Fatalf("create root marker: %v", err)
	}
	rootGroup := &TaskGroupModel{LogStoreDir: stringPointer(root)}
	if err := db.Create(rootGroup).Error; err != nil {
		t.Fatalf("create root task group: %v", err)
	}
	rootGroup.Delete(db, root)
	if _, err := os.Stat(rootGroupMarker); err != nil {
		t.Fatalf("configured root was removed: %v", err)
	}

	workDir := t.TempDir()
	t.Chdir(workDir)
	relativeManagedDir := filepath.Join(workDir, "relative-logs", "1")
	if err := os.MkdirAll(relativeManagedDir, 0o700); err != nil {
		t.Fatalf("create relative managed directory: %v", err)
	}
	relativeGroup := &TaskGroupModel{LogStoreDir: stringPointer(filepath.Join("relative-logs", "1"))}
	if err := db.Create(relativeGroup).Error; err != nil {
		t.Fatalf("create relative task group: %v", err)
	}
	relativeGroup.Delete(db, filepath.Join(workDir, "relative-logs"))
	if _, err := os.Stat(relativeManagedDir); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("relative managed path still exists or returned unexpected error: %v", err)
	}
}

func TestTaskGroupDeleteCleansLegacyDefaultDirectory(t *testing.T) {
	gormDB, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "test.sqlite.db")))
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	db := &dbstore.DB{DB: gormDB}
	if err := autoMigrate(db); err != nil {
		t.Fatalf("migrate test database: %v", err)
	}

	legacyRoot, err := os.MkdirTemp("", legacyDefaultLogStorePrefix)
	if err != nil {
		t.Fatalf("create legacy log directory: %v", err)
	}
	defer os.RemoveAll(legacyRoot)

	taskGroupID := uint(123)
	legacyGroupDir := filepath.Join(legacyRoot, "123")
	if err := os.MkdirAll(legacyGroupDir, 0o700); err != nil {
		t.Fatalf("create legacy task group directory: %v", err)
	}
	legacyMarker := filepath.Join(legacyGroupDir, "marker")
	if err := os.WriteFile(legacyMarker, []byte("remove"), 0o600); err != nil {
		t.Fatalf("create legacy marker: %v", err)
	}

	taskGroup := &TaskGroupModel{ID: taskGroupID, LogStoreDir: stringPointer(legacyGroupDir)}
	if err := db.Create(taskGroup).Error; err != nil {
		t.Fatalf("create legacy task group: %v", err)
	}
	taskGroup.Delete(db, filepath.Join(t.TempDir(), "logs"))

	if _, err := os.Stat(legacyMarker); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("legacy task group was not removed: %v", err)
	}
	if _, err := os.Stat(legacyRoot); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("empty legacy root was not removed: %v", err)
	}
}
