// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package sqlauth

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"go.uber.org/zap/zaptest/observer"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

func TestSQLLoginHidesCredentialValidity(t *testing.T) {
	for _, level := range []zapcore.Level{zapcore.InfoLevel, zapcore.DebugLevel} {
		t.Run(level.String(), func(t *testing.T) {
			core, logs := observer.New(level)
			restore := log.ReplaceGlobals(zap.New(core), &log.ZapProperties{Level: zap.NewAtomicLevelAt(level)})
			t.Cleanup(restore)

			a, service := newTestAuthenticator(t)
			gin.SetMode(gin.TestMode)
			r := gin.New()
			r.Use(rest.ErrorHandlerFn())
			r.POST("/login", service.LoginHandler)
			ciphertext, err := user.Encrypt("synthetic-password", service.RsaPublicKey)
			require.NoError(t, err)
			privilegeErr := user.ErrInsufficientPrivs.New("synthetic privilege detail").
				WithProperty(user.SQLUserAuthenticated, true)
			var firstBody string
			for _, backendErr := range []error{
				tidb.ErrTiDBAuthFailed.New("synthetic driver detail"),
				privilegeErr,
				errorx.Decorate(privilegeErr, "synthetic verification detail"),
			} {
				a.verifySQLUser = func(_, _ string) (bool, error) { return false, backendErr }
				for _, encrypted := range []string{ciphertext, invalidPaddingCiphertext(service.RsaPublicKey), "not-base64"} {
					body, err := json.Marshal(user.AuthenticateForm{Type: typeID, Username: "synthetic-user", Password: encrypted})
					require.NoError(t, err)
					response := httptest.NewRecorder()
					r.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/login", bytes.NewReader(body)))
					require.Equal(t, http.StatusUnauthorized, response.Code)
					if firstBody == "" {
						firstBody = response.Body.String()
					} else {
						require.Equal(t, firstBody, response.Body.String())
					}
					var failure rest.ErrorResponse
					require.NoError(t, json.Unmarshal(response.Body.Bytes(), &failure))
					require.Equal(t, "tidb.tidb_auth_failed", failure.Code)
					require.NotContains(t, response.Body.String(), "insufficient_priv")
					require.NotContains(t, response.Body.String(), "synthetic")
					require.NotContains(t, response.Body.String(), `"token"`)
				}
			}
			require.Equal(t, 6, logs.FilterMessage("SQL login rejected: insufficient Dashboard privileges").Len())
		})
	}
}
