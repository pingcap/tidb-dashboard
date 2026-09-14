// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package logsearch

import (
	"path/filepath"
	"testing"
)

func TestResolveTaskLogPath(t *testing.T) {
	logStoreDir := t.TempDir()
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
			task:   TaskModel{LogStorePath: stringPointer(filepath.Join(logStoreDir, "task-1.zip"))},
			logDir: stringPointer(logStoreDir),
			want:   filepath.Join(logStoreDir, "task-1.zip"),
		},
		{
			name:   "slow log fallback",
			task:   TaskModel{SlowLogStorePath: stringPointer(filepath.Join(logStoreDir, "task-1-slow.zip"))},
			logDir: stringPointer(logStoreDir),
			want:   filepath.Join(logStoreDir, "task-1-slow.zip"),
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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resolveTaskLogPath(&tt.task, tt.logDir)
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

func stringPointer(value string) *string {
	return &value
}
