// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package logsearch

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

func TestGetDownloadTokenValidatesTasks(t *testing.T) {
	gormDB, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "test.sqlite.db")))
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	db := &dbstore.DB{DB: gormDB}
	if err := autoMigrate(db); err != nil {
		t.Fatalf("migrate test database: %v", err)
	}

	finished := &TaskModel{State: TaskStateFinished}
	if err := db.Create(finished).Error; err != nil {
		t.Fatalf("create finished task: %v", err)
	}
	running := &TaskModel{State: TaskStateRunning}
	if err := db.Create(running).Error; err != nil {
		t.Fatalf("create running task: %v", err)
	}

	service := &Service{db: db}
	tests := []struct {
		name       string
		query      string
		wantStatus int
		wantData   string
	}{
		{name: "finished task", query: "?id=1", wantStatus: http.StatusOK, wantData: "1"},
		{name: "running task", query: "?id=2", wantStatus: http.StatusBadRequest},
		{name: "future task", query: "?id=3", wantStatus: http.StatusBadRequest},
		{name: "invalid task ID", query: "?id=invalid", wantStatus: http.StatusBadRequest},
		{name: "empty task list", wantStatus: http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			engine := gin.New()
			engine.Use(rest.ErrorHandlerFn())
			engine.GET("/token", service.GetDownloadToken)

			response := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, "/token"+tt.query, nil)
			engine.ServeHTTP(response, request)
			if response.Code != tt.wantStatus {
				t.Fatalf("unexpected status: got %d, want %d", response.Code, tt.wantStatus)
			}
			if tt.wantStatus == http.StatusOK {
				data, err := utils.ParseJWTString("logs/download", response.Body.String())
				if err != nil {
					t.Fatalf("parse download token: %v", err)
				}
				if data != tt.wantData {
					t.Fatalf("unexpected token data: got %q, want %q", data, tt.wantData)
				}
			}
		})
	}
}
