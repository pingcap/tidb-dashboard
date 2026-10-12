// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestSetNgmDashboardAuthHeader(t *testing.T) {
	for _, tc := range []struct {
		name          string
		token         string
		expectedToken string
	}{
		{name: "new ng-monitoring", token: "topology-token", expectedToken: "topology-token"},
		{name: "old ng-monitoring", token: "", expectedToken: ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/", nil)
			request.Header.Set(ngmDashboardAuthHeader, "caller-supplied-token")
			setNgmDashboardAuthHeader(request, tc.token)
			require.Equal(t, tc.expectedToken, request.Header.Get(ngmDashboardAuthHeader))
		})
	}
}

func TestModifyNgmResponse(t *testing.T) {
	t.Run("unauthorized response", func(t *testing.T) {
		proxy := &NgmProxy{}
		proxy.ngmTargetCache.Store(&ngmTargetCacheEntity{
			target:  ngmTarget{address: "http://ng-monitoring"},
			cacheAt: time.Now(),
		})
		response := &http.Response{
			StatusCode: http.StatusUnauthorized,
			Status:     "401 Unauthorized",
		}

		require.NoError(t, proxy.modifyNgmResponse(response))
		require.Equal(t, http.StatusBadGateway, response.StatusCode)
		require.Equal(t, "502 Bad Gateway", response.Status)
		require.True(t, proxy.ngmTargetCache.Load().(*ngmTargetCacheEntity).cacheAt.IsZero())
	})

	t.Run("other response", func(t *testing.T) {
		proxy := &NgmProxy{}
		cacheAt := time.Now()
		proxy.ngmTargetCache.Store(&ngmTargetCacheEntity{
			target:  ngmTarget{address: "http://ng-monitoring"},
			cacheAt: cacheAt,
		})
		response := &http.Response{
			StatusCode: http.StatusOK,
			Status:     "200 OK",
		}

		require.NoError(t, proxy.modifyNgmResponse(response))
		require.Equal(t, http.StatusOK, response.StatusCode)
		require.Equal(t, "200 OK", response.Status)
		require.Equal(t, cacheAt, proxy.ngmTargetCache.Load().(*ngmTargetCacheEntity).cacheAt)
	})
}
