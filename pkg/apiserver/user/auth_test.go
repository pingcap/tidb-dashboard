// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package user

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

func TestMWRequireWritePriv(t *testing.T) {
	tests := []struct {
		name           string
		isWriteable    bool
		wantStatus     int
		wantNextCalled bool
	}{
		{
			name:           "writeable session",
			isWriteable:    true,
			wantStatus:     http.StatusNoContent,
			wantNextCalled: true,
		},
		{
			name:           "read-only session",
			isWriteable:    false,
			wantStatus:     http.StatusForbidden,
			wantNextCalled: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			engine := gin.New()
			engine.Use(rest.ErrorHandlerFn())
			called := false
			authService := &AuthService{}

			engine.GET("/", func(c *gin.Context) {
				c.Set(utils.SessionUserKey, &utils.SessionUser{IsWriteable: tt.isWriteable})
			}, authService.MWRequireWritePriv(), func(c *gin.Context) {
				called = true
				c.Status(http.StatusNoContent)
			})

			request := httptest.NewRequest(http.MethodGet, "/", nil)
			response := httptest.NewRecorder()
			engine.ServeHTTP(response, request)

			if response.Code != tt.wantStatus {
				t.Fatalf("unexpected status: got %d, want %d", response.Code, tt.wantStatus)
			}
			if called != tt.wantNextCalled {
				t.Fatalf("unexpected next handler invocation: got %t, want %t", called, tt.wantNextCalled)
			}
		})
	}
}
