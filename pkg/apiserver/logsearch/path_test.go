// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package logsearch

import (
	"errors"
	"path/filepath"
	"testing"
)

func TestResolvePathWithinDirectory(t *testing.T) {
	directory := filepath.Join(t.TempDir(), "logs")

	tests := []struct {
		name      string
		path      string
		wantError bool
	}{
		{name: "file in directory", path: "task-1.zip"},
		{name: "nested file in directory", path: filepath.Join("nested", "task-1.zip")},
		{name: "parent traversal", path: filepath.Join("..", "outside.zip"), wantError: true},
		{name: "sibling directory prefix", path: filepath.Join(directory+"-other", "outside.zip"), wantError: true},
		{name: "absolute path outside directory", path: filepath.Join(t.TempDir(), "outside.zip"), wantError: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := resolvePathWithinDirectory(directory, tt.path)
			if tt.wantError {
				if !errors.Is(err, errPathOutsideDirectory) {
					t.Fatalf("resolvePathWithinDirectory() error = %v, want %v", err, errPathOutsideDirectory)
				}
				return
			}
			if err != nil {
				t.Fatalf("resolvePathWithinDirectory() unexpected error: %v", err)
			}
		})
	}
}

func TestResolveChildPathWithinDirectoryRejectsDirectoryItself(t *testing.T) {
	directory := t.TempDir()
	if _, err := resolveChildPathWithinDirectory(directory, directory); !errors.Is(err, errPathOutsideDirectory) {
		t.Fatalf("resolveChildPathWithinDirectory() error = %v, want %v", err, errPathOutsideDirectory)
	}
}

func TestResolveStoredPathWithinDirectory(t *testing.T) {
	workDir := t.TempDir()
	t.Chdir(workDir)

	directory := filepath.Join(workDir, "logs")
	storedPath := filepath.Join("logs", "1")
	got, err := resolveStoredChildPathWithinDirectory(directory, storedPath)
	if err != nil {
		t.Fatalf("resolveStoredChildPathWithinDirectory() unexpected error: %v", err)
	}
	want := filepath.Join(directory, "1")
	if got != want {
		t.Fatalf("resolveStoredChildPathWithinDirectory() = %q, want %q", got, want)
	}
}
