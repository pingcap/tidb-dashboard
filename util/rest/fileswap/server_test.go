// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package fileswap

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/assertutil"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

func (s *Handler) mustGetDownloadToken(t *testing.T, fileContent string, downloadFileName string, expireIn time.Duration) string {
	fw, err := s.NewFileWriter("test")
	require.NoError(t, err)
	_, err = fmt.Fprint(fw, fileContent)
	require.NoError(t, err)
	err = fw.Close()
	require.NoError(t, err)
	token, err := fw.GetDownloadToken(downloadFileName, expireIn)
	require.NoError(t, err)
	return token
}

func TestDownload(t *testing.T) {
	handler := New()
	token := handler.mustGetDownloadToken(t, "foobar", "file.txt", time.Second*5)

	r := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(r)
	c.Request, _ = http.NewRequest(http.MethodGet, "/download?token="+token, nil)
	handler.HandleDownloadRequest(c)

	require.Len(t, c.Errors, 0)
	require.Equal(t, http.StatusOK, r.Code)
	require.Equal(t, `attachment; filename="file.txt"`, r.Header().Get("Content-Disposition"))
	require.Equal(t, `application/octet-stream`, r.Header().Get("Content-Type"))
	require.Equal(t, "foobar", r.Body.String())

	// Download again
	r = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(r)
	c.Request, _ = http.NewRequest(http.MethodGet, "/download?token="+token, nil)
	handler.HandleDownloadRequest(c)

	require.Len(t, c.Errors, 1)
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Contains(t, c.Errors[0].Error(), "Download file not found")
}

func TestDownloadAnotherInstance(t *testing.T) {
	handler := New()
	token := handler.mustGetDownloadToken(t, "foobar", "file.txt", time.Second*5)

	handler2 := New()
	r := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(r)
	c.Request, _ = http.NewRequest(http.MethodGet, "/download?token="+token, nil)
	handler2.HandleDownloadRequest(c)

	require.Len(t, c.Errors, 1)
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Contains(t, c.Errors[0].Error(), "Invalid download request")
	require.Contains(t, c.Errors[0].Error(), "download token is invalid")
}

func TestExpiredToken(t *testing.T) {
	handler := New()
	token := handler.mustGetDownloadToken(t, "foobar", "file.txt", 0)

	// Note: token expiration precision is 1sec.
	time.Sleep(time.Millisecond * 1100)

	r := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(r)
	c.Request, _ = http.NewRequest(http.MethodGet, "/download?token="+token, nil)
	handler.HandleDownloadRequest(c)

	require.Len(t, c.Errors, 1)
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Contains(t, c.Errors[0].Error(), "Invalid download request")
	require.Contains(t, c.Errors[0].Error(), "download token is expired")
}

func TestNotAToken(t *testing.T) {
	handler := New()

	r := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(r)
	c.Request, _ = http.NewRequest(http.MethodGet, "/download?token=abc", nil)
	handler.HandleDownloadRequest(c)

	require.Len(t, c.Errors, 1)
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Contains(t, c.Errors[0].Error(), "Invalid download request")
	require.Contains(t, c.Errors[0].Error(), "download token is invalid")
}

func TestDownloadInMiddleware(t *testing.T) {
	handler := New()
	token := handler.mustGetDownloadToken(t, "abc", "myfile.bin", time.Second*5)

	engine := gin.New()
	engine.Use(rest.ErrorHandlerFn())
	engine.GET("/download", handler.HandleDownloadRequest)

	// A normal request
	r := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/download?token="+token, nil)
	engine.ServeHTTP(r, req)
	require.Equal(t, http.StatusOK, r.Code)
	require.Equal(t, `attachment; filename="myfile.bin"`, r.Header().Get("Content-Disposition"))
	require.Equal(t, `application/octet-stream`, r.Header().Get("Content-Type"))
	require.Equal(t, "abc", r.Body.String())

	// A request without token
	r = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/download", nil)
	engine.ServeHTTP(r, req)
	require.Equal(t, http.StatusBadRequest, r.Code)
	require.Equal(t, "", r.Header().Get("Content-Disposition"))
	require.Equal(t, "application/json; charset=utf-8", r.Header().Get("Content-Type"))
	assertutil.RequireJSONContains(t, r.Body.String(), `{"code":"common.bad_request", "error":true}`)
}
