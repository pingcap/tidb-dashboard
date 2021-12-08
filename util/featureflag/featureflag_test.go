// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package featureflag

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"github.com/pingcap/tidb-dashboard/util/rest"
	"github.com/stretchr/testify/require"
)

func Test_Name(t *testing.T) {
	f1 := &FeatureFlag{}
	require.Equal(t, f1.Name(), "")

	f2 := newFeatureFlag("testFeature", "v5.3.0", ">= 5.3.0")
	require.Equal(t, f2.Name(), "testFeature")
}

func Test_IsSupported(t *testing.T) {
	type Args struct {
		target      string
		constraints []string
	}
	tests := []struct {
		want bool
		args Args
	}{
		{want: false, args: Args{target: "v4.2.0", constraints: []string{">= 5.3.0"}}},
		{want: false, args: Args{target: "v5.2.0", constraints: []string{">= 5.3.0"}}},
		{want: true, args: Args{target: "v5.3.0", constraints: []string{">= 5.3.0"}}},
		{want: false, args: Args{target: "v5.2.0-alpha-xxx", constraints: []string{">= 5.3.0"}}},
		{want: true, args: Args{target: "v5.3.0-alpha-xxx", constraints: []string{">= 5.3.0"}}},
		{want: true, args: Args{target: "v5.3.0", constraints: []string{"= 5.3.0"}}},
		{want: false, args: Args{target: "v5.3.1", constraints: []string{"= 5.3.0"}}},
	}

	for _, tt := range tests {
		ff := newFeatureFlag("testFeature", tt.args.target, tt.args.constraints...)
		require.Equal(t, tt.want, ff.IsSupported())
	}
}

func Test_VersionGuard(t *testing.T) {
	r := require.New(t)
	f1 := newFeatureFlag("testFeature1", "v5.3.0", ">= 5.3.0")
	f2 := newFeatureFlag("testFeature2", "v5.3.0", ">= 5.3.1")

	// success
	e := gin.Default()
	e.Use(f1.VersionGuard())
	e.GET("/ping", func(c *gin.Context) {
		c.String(200, "pong")
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/ping", nil)
	e.ServeHTTP(w, req)

	r.Equal(200, w.Code)
	r.Equal("pong", w.Body.String())

	// abort with other middlewares
	handled := false
	e2 := gin.Default()
	e2.Use(func(c *gin.Context) {
		c.Next()

		handled = true

		// check error type
		currentErr := c.Errors.Last().Err
		codeProperty, _ := rest.HTTPCodeProperty(http.StatusForbidden)
		code, ok := c.Errors.Last().Err.(*errorx.Error).Property(codeProperty)
		r.True(ok)

		r.Equal(true, errorx.IsOfType(currentErr, ErrFeatureUnsupported))
		r.Equal(http.StatusForbidden, code)
	})
	e2.Use(f1.VersionGuard(), f2.VersionGuard())
	e2.GET("/ping", func(c *gin.Context) {
		c.String(200, "pong")
	})
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("GET", "/ping", nil)
	e2.ServeHTTP(w2, req2)

	r.Equal(true, handled)
}
