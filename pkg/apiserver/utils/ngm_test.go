// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"net/http"
	"net/http/httptest"
	"testing"

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
