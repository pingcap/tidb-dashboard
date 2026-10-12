// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package diagnose

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

func TestDiagnosisReportRequiresMatchingActionToken(t *testing.T) {
	gormDB, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "test.sqlite.db")))
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	db := &dbstore.DB{DB: gormDB}
	if err := autoMigrate(db); err != nil {
		t.Fatalf("migrate test database: %v", err)
	}
	report := &Report{ID: "report-1", Content: `[{"title":"test"}]`}
	if err := db.Create(report).Error; err != nil {
		t.Fatalf("create report: %v", err)
	}

	service := &Service{db: db}
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	engine.Use(rest.ErrorHandlerFn())
	engine.GET("/reports/:id/action_token", service.reportActionTokenHandler)
	engine.GET("/reports/:id/data.js", service.reportDataHandler)

	tokenResponse := httptest.NewRecorder()
	tokenRequest := httptest.NewRequest(http.MethodGet, "/reports/report-1/action_token", nil)
	engine.ServeHTTP(tokenResponse, tokenRequest)
	if tokenResponse.Code != http.StatusOK {
		t.Fatalf("unexpected token status: got %d, want %d", tokenResponse.Code, http.StatusOK)
	}
	token := tokenResponse.Body.String()
	if err := validateReportActionToken(report.ID, token); err != nil {
		t.Fatalf("validate report action token: %v", err)
	}

	for _, tt := range []struct {
		name       string
		path       string
		wantStatus int
	}{
		{name: "matching token", path: "/reports/report-1/data.js?token=" + token, wantStatus: http.StatusOK},
		{name: "missing token", path: "/reports/report-1/data.js", wantStatus: http.StatusBadRequest},
		{name: "token for another report", path: "/reports/report-2/data.js?token=" + token, wantStatus: http.StatusBadRequest},
	} {
		t.Run(tt.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, tt.path, nil)
			engine.ServeHTTP(response, request)
			if response.Code != tt.wantStatus {
				t.Fatalf("unexpected status: got %d, want %d", response.Code, tt.wantStatus)
			}
		})
	}

	missingResponse := httptest.NewRecorder()
	missingRequest := httptest.NewRequest(http.MethodGet, "/reports/report-2/action_token", nil)
	engine.ServeHTTP(missingResponse, missingRequest)
	if missingResponse.Code != http.StatusBadRequest {
		t.Fatalf("unexpected missing report status: got %d, want %d", missingResponse.Code, http.StatusBadRequest)
	}

	wrongIssuerToken, err := utils.NewJWTStringWithExpire("other", report.ID, reportActionTokenTTL)
	if err != nil {
		t.Fatalf("create wrong issuer token: %v", err)
	}
	if err := validateReportActionToken(report.ID, wrongIssuerToken); err == nil {
		t.Fatal("token with the wrong issuer was accepted")
	}
}
