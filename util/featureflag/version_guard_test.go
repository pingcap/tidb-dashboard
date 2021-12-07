// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package featureflag

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"github.com/stretchr/testify/require"
)

func Test_VersionGuard(t *testing.T) {
	r := require.New(t)
	m := NewRegistry("v5.3.0")
	f1 := m.Register("testFeature1", ">= 5.3.0")
	f2 := m.Register("testFeature2", ">= 5.3.1")

	// success
	e := gin.Default()
	e.Use(VersionGuard("v5.3.0", f1))
	e.GET("/ping", func(c *gin.Context) {
		c.String(200, "pong")
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/ping", nil)
	e.ServeHTTP(w, req)

	r.Equal(200, w.Code)
	r.Equal("pong", w.Body.String())

	// StatusForbidden
	e2 := gin.Default()
	handled := false
	e2.Use(func(c *gin.Context) {
		c.Next()

		// test error type
		handled = true
		r.Equal(true, errorx.IsOfType(c.Errors[0].Err, ErrFeatureUnsupported))
	})
	e2.Use(VersionGuard("v5.3.0", f1, f2))
	e2.GET("/ping", func(c *gin.Context) {
		c.String(200, "pong")
	})
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("GET", "/ping", nil)
	e2.ServeHTTP(w2, req2)

	r.Equal(http.StatusForbidden, w2.Code)
	r.Equal(true, handled)
}
