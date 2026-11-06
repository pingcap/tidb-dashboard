// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package diagnose

import (
	"net"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/internal/authtest"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

func TestDiagnosisRouteAuthorization(t *testing.T) {
	// Fail any SQL connection deterministically, without requiring a live cluster.
	// A writer must still reach this backend; a reader must be rejected before it.
	var connections atomic.Int32
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			connections.Add(1)
			// MySQL handshake error ER_CON_COUNT_ERROR, with a recognizable message.
			payload := append([]byte{0xff, 0x10, 0x04}, []byte("test SQL backend reached")...)
			packet := append([]byte{byte(len(payload)), 0, 0, 0}, payload...)
			_, _ = conn.Write(packet)
			_ = conn.Close()
		}
	}()
	t.Cleanup(func() {
		_ = listener.Close()
		<-done
	})
	t.Setenv("TIDB_OVERRIDE_ENDPOINT", "")
	sqlClient := (&tidb.Client{}).WithSQLAPIAddress("127.0.0.1", listener.Addr().(*net.TCPAddr).Port)
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "test.sqlite")))
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, sqlDB.Close()) })
	store := &dbstore.DB{DB: db}
	require.NoError(t, autoMigrate(store))
	report := &Report{ID: "existing-report", Content: `[{"title":"shared report"}]`}
	require.NoError(t, db.Create(report).Error)
	service := &Service{db: store, tidbClient: sqlClient}
	auth := authtest.New(t)
	engine := gin.New()
	engine.Use(rest.ErrorHandlerFn())
	RegisterRouter(engine.Group("/api"), auth, service)
	request := func(method, path, token, body string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, "/api/diagnose"+path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		response := httptest.NewRecorder()
		engine.ServeHTTP(response, req)
		return response
	}
	for _, kind := range []utils.AuthType{utils.AuthTypeSQL, utils.AuthTypeCode, utils.AuthTypeSSO} {
		for _, writeable := range []bool{false, true} {
			session := utils.SessionUser{AuthFrom: kind, HasTiDBAuth: true, IsWriteable: writeable}
			token := authtest.Token(t, auth, session)
			for _, path := range []string{"/reports", "/metrics_relation/generate", "/diagnosis"} {
				t.Run(map[utils.AuthType]string{utils.AuthTypeSQL: "SQL", utils.AuthTypeCode: "sharing code", utils.AuthTypeSSO: "SSO"}[kind]+"/"+map[bool]string{true: "writer", false: "reader"}[writeable]+path, func(t *testing.T) {
					before := connections.Load()
					body := `{"start_time":1,"end_time":2,"kind":"config"}`
					if writeable && path == "/metrics_relation/generate" {
						body = "{" // Preserve the existing writer-side validation error.
					}
					response := request(http.MethodPost, path, token, body)
					if !writeable {
						require.Equal(t, http.StatusForbidden, response.Code, response.Body.String())
						require.Equal(t, before, connections.Load(), "denied requests must not open SQL connections")
					} else if path == "/metrics_relation/generate" {
						require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
					} else {
						require.Equal(t, http.StatusInternalServerError, response.Code, response.Body.String())
						require.Contains(t, response.Body.String(), "test SQL backend reached")
						require.Greater(t, connections.Load(), before)
					}
				})
			}
			// Existing shared report history and viewing remain available to readers.
			require.Equal(t, http.StatusOK, request(http.MethodGet, "/reports", token, "").Code)
			tokenResponse := request(http.MethodGet, "/reports/"+report.ID+"/action_token", token, "")
			require.Equal(t, http.StatusOK, tokenResponse.Code, tokenResponse.Body.String())
			data := request(http.MethodGet, "/reports/"+report.ID+"/data.js?token="+tokenResponse.Body.String(), "", "")
			require.Equal(t, http.StatusOK, data.Code, data.Body.String())
			require.Contains(t, data.Body.String(), "shared report")
		}
	}
	for _, path := range []string{"/reports", "/metrics_relation/generate", "/diagnosis"} {
		require.Equal(t, http.StatusUnauthorized, request(http.MethodPost, path, "", "{").Code)
	}
	var reports []Report
	require.NoError(t, db.Find(&reports).Error)
	require.Len(t, reports, 1, "denied requests must not create reports")
	require.Equal(t, report.Content, reports[0].Content)
}
