// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestPrepareNgmProxyRequest(t *testing.T) {
	for _, tc := range []struct {
		name          string
		token         string
		expectedToken string
	}{
		{name: "new ng-monitoring", token: "topology-token", expectedToken: "topology-token"},
		{name: "old ng-monitoring", token: "", expectedToken: ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/source?query=value", strings.NewReader("request body"))
			request.Header.Set("Authorization", "Bearer dashboard-session")
			request.Header.Set("Cookie", "dashboard_session=session-value")
			request.Header.Set("Content-Type", "application/json")
			request.Header.Set("X-Request-ID", "request-id")
			request.Header.Set(ngmDashboardAuthHeader, "caller-supplied-token")

			prepareNgmProxyRequest(request, tc.token)

			require.Empty(t, request.Header.Get("Authorization"))
			require.Equal(t, "dashboard_session=session-value", request.Header.Get("Cookie"))
			require.Equal(t, "application/json", request.Header.Get("Content-Type"))
			require.Equal(t, "request-id", request.Header.Get("X-Request-ID"))
			require.Equal(t, tc.expectedToken, request.Header.Get(ngmDashboardAuthHeader))
			require.Equal(t, http.MethodPost, request.Method)
			require.Equal(t, "query=value", request.URL.RawQuery)
			body, err := io.ReadAll(request.Body)
			require.NoError(t, err)
			require.Equal(t, "request body", string(body))
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
