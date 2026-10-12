// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

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

func TestGetActionTokenValidatesActionAndResource(t *testing.T) {
	gormDB, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "test.sqlite.db")))
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	db := &dbstore.DB{DB: gormDB}
	if err := autoMigrate(db); err != nil {
		t.Fatalf("migrate test database: %v", err)
	}

	for _, group := range []*TaskGroupModel{
		{State: TaskStateFinish},
		{State: TaskStatePartialFinish},
		{State: TaskStateRunning},
	} {
		if err := db.Create(group).Error; err != nil {
			t.Fatalf("create task group: %v", err)
		}
	}
	for _, task := range []*TaskModel{
		{State: TaskStateFinish},
		{State: TaskStateRunning},
	} {
		if err := db.Create(task).Error; err != nil {
			t.Fatalf("create task: %v", err)
		}
	}

	service := &Service{params: ServiceParams{LocalStore: db}}
	tests := []struct {
		name       string
		query      string
		wantStatus int
		issuer     string
	}{
		{name: "finished group", query: "?id=1&action=group_download", wantStatus: http.StatusOK, issuer: "profiling/group_download"},
		{name: "partially finished group", query: "?id=2&action=group_download", wantStatus: http.StatusOK, issuer: "profiling/group_download"},
		{name: "running group", query: "?id=3&action=group_download", wantStatus: http.StatusBadRequest},
		{name: "finished task download", query: "?id=1&action=single_download", wantStatus: http.StatusOK, issuer: "profiling/single_download"},
		{name: "finished task view", query: "?id=1&action=single_view", wantStatus: http.StatusOK, issuer: "profiling/single_view"},
		{name: "running task", query: "?id=2&action=single_view", wantStatus: http.StatusBadRequest},
		{name: "future task", query: "?id=3&action=single_view", wantStatus: http.StatusBadRequest},
		{name: "unknown action", query: "?id=1&action=unknown", wantStatus: http.StatusBadRequest},
		{name: "invalid ID", query: "?id=invalid&action=single_view", wantStatus: http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			engine := gin.New()
			engine.Use(rest.ErrorHandlerFn())
			engine.GET("/token", service.getActionToken)

			response := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, "/token"+tt.query, nil)
			engine.ServeHTTP(response, request)
			if response.Code != tt.wantStatus {
				t.Fatalf("unexpected status: got %d, want %d", response.Code, tt.wantStatus)
			}
			if tt.wantStatus == http.StatusOK {
				data, err := utils.ParseJWTString(tt.issuer, response.Body.String())
				if err != nil {
					t.Fatalf("parse action token: %v", err)
				}
				if data == "" {
					t.Fatal("token data is empty")
				}
			}
		})
	}
}
