// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package logsearch

import (
	"path/filepath"
	"testing"
)

func TestResolveTaskLogPath(t *testing.T) {
	logStoreDir := t.TempDir()
	taskGroupDir := filepath.Join(logStoreDir, "1")
	outsidePath := filepath.Join(t.TempDir(), "outside.zip")

	tests := []struct {
		name      string
		task      TaskModel
		logDir    *string
		want      string
		wantError bool
	}{
		{
			name:   "normal path",
			task:   TaskModel{LogStorePath: stringPointer(filepath.Join(taskGroupDir, "task-1.zip"))},
			logDir: stringPointer(taskGroupDir),
			want:   filepath.Join(taskGroupDir, "task-1.zip"),
		},
		{
			name:   "slow log fallback",
			task:   TaskModel{SlowLogStorePath: stringPointer(filepath.Join(taskGroupDir, "task-1-slow.zip"))},
			logDir: stringPointer(taskGroupDir),
			want:   filepath.Join(taskGroupDir, "task-1-slow.zip"),
		},
		{
			name:      "path outside log directory",
			task:      TaskModel{LogStorePath: &outsidePath},
			logDir:    stringPointer(logStoreDir),
			wantError: true,
		},
		{
			name:      "missing log directory",
			task:      TaskModel{LogStorePath: stringPointer(filepath.Join(logStoreDir, "task-1.zip"))},
			wantError: true,
		},
		{
			name:      "task group directory outside configured directory",
			task:      TaskModel{LogStorePath: stringPointer(filepath.Join(outsidePath, "task-1.zip"))},
			logDir:    stringPointer(filepath.Dir(outsidePath)),
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resolveTaskLogPath(&tt.task, logStoreDir, tt.logDir)
			if tt.wantError {
				if err == nil {
					t.Fatal("resolveTaskLogPath() error = nil, want error")
				}
				return
			}
			if err != nil {
				t.Fatalf("resolveTaskLogPath() unexpected error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("resolveTaskLogPath() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestResolveTaskLogPathWithRelativePersistedPaths(t *testing.T) {
	workDir := t.TempDir()
	t.Chdir(workDir)

	logStoreDir := filepath.Join(workDir, "logs")
	task := TaskModel{
		LogStorePath: stringPointer(filepath.Join("logs", "1", "task-1.zip")),
	}
	got, err := resolveTaskLogPath(&task, logStoreDir, stringPointer(filepath.Join("logs", "1")))
	if err != nil {
		t.Fatalf("resolveTaskLogPath() unexpected error: %v", err)
	}
	want := filepath.Join(logStoreDir, "1", "task-1.zip")
	if got != want {
		t.Fatalf("resolveTaskLogPath() = %q, want %q", got, want)
	}
}

func stringPointer(value string) *string {
	return &value
}
