// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package apiserver

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/pkg/config"
)

func TestNewAPIHandlerEngineUsesPublicPathPrefix(t *testing.T) {
	cfg := config.Default()
	cfg.PublicPathPrefix = "/test"
	cfg.NormalizePublicPathPrefix()

	engine, endpoint := newAPIHandlerEngine(cfg)
	endpoint.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})

	req := httptest.NewRequest(http.MethodGet, "/test/api/ping", nil)
	rec := httptest.NewRecorder()
	engine.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /test/api/ping status = %d, want %d", rec.Code, http.StatusOK)
	}

	req = httptest.NewRequest(http.MethodGet, "/dashboard/api/ping", nil)
	rec = httptest.NewRecorder()
	engine.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("GET /dashboard/api/ping status = %d, want %d", rec.Code, http.StatusNotFound)
	}
}
