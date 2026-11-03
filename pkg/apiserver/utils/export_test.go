// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"bytes"
	"encoding/base64"
	"encoding/csv"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	jwt "github.com/golang-jwt/jwt/v4"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/rest"
)

func exportTestCSV(t *testing.T, data [][]string) (token, path, expected string) {
	t.Helper()
	token, err := ExportCSV(data, "dashboard-export-test-*.csv", "export-test")
	require.NoError(t, err)
	plain, err := ParseJWTString("export-test", token)
	require.NoError(t, err)
	fields := strings.Fields(plain)
	require.Len(t, fields, 2)
	key, err := base64.StdEncoding.DecodeString(fields[0])
	require.NoError(t, err)
	require.Len(t, key, 32)
	path = fields[1]
	t.Cleanup(func() { _ = os.Remove(path) })
	var buf bytes.Buffer
	require.NoError(t, csv.NewWriter(&buf).WriteAll(data))
	return token, path, buf.String()
}

func downloadTestCSV(token string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	engine := gin.New()
	engine.Use(rest.ErrorHandlerFn())
	engine.GET("/download", func(c *gin.Context) {
		DownloadByToken(token, "export-test", c)
	})
	engine.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/download", nil))
	return w
}

func TestExportCSVPreservesDownloadContract(t *testing.T) {
	for _, tc := range []struct {
		name string
		data [][]string
	}{
		{name: "empty"},
		{name: "quoted unicode", data: [][]string{{"字段", "quoted, field"}, {"多行\n内容", `a "quote"`}}},
		{name: "multiple chunks", data: [][]string{{"header"}, {strings.Repeat("valid CSV content ", 300000)}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			token, path, expected := exportTestCSV(t, tc.data)
			stat, err := os.Stat(path)
			require.NoError(t, err)
			require.Equal(t, os.FileMode(0o600), stat.Mode().Perm())
			var claims Claims
			_, _, err = new(jwt.Parser).ParseUnverified(token, &claims)
			require.NoError(t, err)
			require.InDelta(t, 24*time.Hour.Seconds(), time.Until(time.Unix(claims.ExpiresAt, 0)).Seconds(), 2)
			w := downloadTestCSV(token)
			require.Equal(t, http.StatusOK, w.Code)
			require.Equal(t, "text/csv", w.Header().Get("Content-Type"))
			require.Equal(t, `attachment; filename="`+filepath.Base(path)+`"`, w.Header().Get("Content-Disposition"))
			require.Equal(t, expected, w.Body.String())
			_, err = os.Stat(path)
			require.True(t, os.IsNotExist(err))
		})
	}
}

func TestDownloadCSVDoesNotReleaseUnauthenticatedChunks(t *testing.T) {
	for _, tc := range []struct {
		name   string
		modify func([]byte) []byte
	}{
		{name: "first chunk", modify: func(b []byte) []byte { b[32] ^= 1; return b }},
		{name: "later chunk", modify: func(b []byte) []byte { b[65536+64] ^= 1; return b }},
		{name: "last tag", modify: func(b []byte) []byte { b[len(b)-1] ^= 1; return b }},
		{name: "truncated", modify: func(b []byte) []byte { return b[:len(b)-1] }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			token, path, expected := exportTestCSV(t, [][]string{{strings.Repeat("authentic CSV row ", 12000)}})
			encrypted, err := os.ReadFile(path)
			require.NoError(t, err)
			require.NoError(t, os.WriteFile(path, tc.modify(encrypted), 0o600))
			w := downloadTestCSV(token)
			if tc.name == "first chunk" {
				require.Equal(t, http.StatusBadRequest, w.Code)
				require.Empty(t, w.Header().Get("Content-Disposition"))
				require.Contains(t, w.Body.String(), "invalid export file")
			} else {
				// Streaming may have returned an authenticated prefix, never the damaged chunk.
				require.Less(t, w.Body.Len(), len(expected))
				require.True(t, strings.HasPrefix(expected, w.Body.String()))
			}
			_, err = os.Stat(path)
			require.True(t, os.IsNotExist(err))
		})
	}
}

func TestDownloadCSVRejectsInvalidKey(t *testing.T) {
	for _, key := range []string{"not-base64", base64.StdEncoding.EncodeToString([]byte("short"))} {
		token, err := NewJWTString("export-test", key+" /unused-fixture")
		require.NoError(t, err)
		w := downloadTestCSV(token)
		require.Equal(t, http.StatusBadRequest, w.Code)
	}
}
