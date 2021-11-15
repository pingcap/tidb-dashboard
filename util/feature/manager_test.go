// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package feature

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func Test_Register(t *testing.T) {
	m := NewManager("v5.3.0")
	tests := []struct {
		supported bool
		flag      *Flag
	}{
		{supported: true, flag: NewFlag("testFeature1", []string{">= 5.3.0"})},
		{supported: true, flag: NewFlag("testFeature2", []string{">= 4.0.0"})},
		{supported: false, flag: NewFlag("testFeature3", []string{">= 5.3.1"})},
	}

	for _, tt := range tests {
		m.Register(tt.flag)
	}

	for i, tt := range tests {
		require.Equal(t, m.flags[i], tt.flag)
		_, ok := m.supportedMap[tt.flag.Name]
		require.Equal(t, tt.supported, ok)
	}
}

func Test_SupportedFeatures(t *testing.T) {
	m := NewManager("v5.3.0")
	f1 := NewFlag("testFeature1", []string{">= 5.3.0"})
	f2 := NewFlag("testFeature2", []string{">= 4.0.0"})
	f3 := NewFlag("testFeature3", []string{">= 5.3.1"})
	m.Register(f1)
	m.Register(f2)
	m.Register(f3)

	require.Equal(t, []string{"testFeature1", "testFeature2"}, m.SupportedFeatures())
}

func Test_Guard(t *testing.T) {
	m := NewManager("v5.3.0")
	f1 := NewFlag("testFeature1", []string{">= 5.3.0"})
	f2 := NewFlag("testFeature2", []string{">= 5.3.1"})
	m.Register(f1)
	m.Register(f2)

	// success
	r := gin.Default()
	r.Use(m.Guard([]*Flag{f1}))
	r.GET("/ping", func(c *gin.Context) {
		c.String(200, "pong")
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/ping", nil)
	r.ServeHTTP(w, req)

	require.Equal(t, 200, w.Code)
	require.Equal(t, "pong", w.Body.String())

	// StatusForbidden
	r2 := gin.Default()
	r2.Use(m.Guard([]*Flag{f1, f2}))
	r2.GET("/ping", func(c *gin.Context) {
		c.String(200, "pong")
	})
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("GET", "/ping", nil)
	r2.ServeHTTP(w2, req2)

	require.Equal(t, 403, w2.Code)
}
