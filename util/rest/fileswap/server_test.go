package fileswap

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func (s *Handler) mustGetDownloadToken(t *testing.T, fileContent string, downloadFileName string, expireIn time.Duration) string {
	fw, err := s.NewFileWriter("test")
	require.Nil(t, err)
	_, err = fmt.Fprint(fw, fileContent)
	require.Nil(t, err)
	err = fw.Close()
	require.Nil(t, err)
	token, err := fw.GetDownloadToken(downloadFileName, expireIn)
	require.Nil(t, err)
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
	require.Equal(t, r.Header().Get("Content-Disposition"), `attachment; filename="file.txt"`)
	require.Equal(t, r.Header().Get("Content-Type"), `application/octet-stream`)
	require.Equal(t, "foobar", r.Body.String())

	// Download again
	r = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(r)
	c.Request, _ = http.NewRequest(http.MethodGet, "/download?token="+token, nil)
	handler.HandleDownloadRequest(c)

	require.Len(t, c.Errors, 1)
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
	require.Contains(t, c.Errors[0].Error(), "Invalid download request")
	require.Contains(t, c.Errors[0].Error(), "download token is invalid")
}
