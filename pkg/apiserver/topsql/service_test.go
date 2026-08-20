// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package topsql

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin/binding"
)

func TestUpdateTikvNetworkIoCollectionRequestBackwardCompatibility(t *testing.T) {
	bindRequest := func(t *testing.T, body string) UpdateTikvNetworkIoCollectionRequest {
		t.Helper()

		req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		var cfg UpdateTikvNetworkIoCollectionRequest
		if err := binding.JSON.Bind(req, &cfg); err != nil {
			t.Fatalf("expected request to bind successfully, got %v", err)
		}
		return cfg
	}

	t.Run("empty request", func(t *testing.T) {
		cfg := bindRequest(t, `{}`)
		if cfg.Enable {
			t.Fatal("expected omitted enable to preserve the false default")
		}
		if cfg.DetailedIoEnabled != nil {
			t.Fatalf("expected omitted detailed_io_enabled to remain nil, got %v", *cfg.DetailedIoEnabled)
		}
	})

	t.Run("detailed IO only", func(t *testing.T) {
		cfg := bindRequest(t, `{"detailed_io_enabled":true}`)
		if cfg.Enable {
			t.Fatal("expected omitted enable to preserve the false default")
		}
		if cfg.DetailedIoEnabled == nil || !*cfg.DetailedIoEnabled {
			t.Fatalf("expected detailed_io_enabled to be true, got %v", cfg.DetailedIoEnabled)
		}
	})
}

func TestSummarizeTiKVCollectionConfig(t *testing.T) {
	testCases := []struct {
		name     string
		total    int
		failures int
		found    int
		enabled  int
		expected tikvCollectionConfigStatus
	}{
		{
			name:    "all enabled",
			total:   3,
			found:   3,
			enabled: 3,
			expected: tikvCollectionConfigStatus{
				enabled: true,
			},
		},
		{
			name:     "all disabled",
			total:    3,
			found:    3,
			enabled:  0,
			expected: tikvCollectionConfigStatus{},
		},
		{
			name:    "mixed values",
			total:   3,
			found:   3,
			enabled: 2,
			expected: tikvCollectionConfigStatus{
				isMultiValue: true,
			},
		},
		{
			name:     "node unavailable",
			total:    3,
			failures: 1,
			found:    2,
			enabled:  2,
			expected: tikvCollectionConfigStatus{
				isMultiValue: true,
			},
		},
		{
			name:  "key missing",
			total: 3,
			expected: tikvCollectionConfigStatus{
				isMultiValue: true,
			},
		},
		{
			name:    "mixed version cluster",
			total:   3,
			found:   2,
			enabled: 2,
			expected: tikvCollectionConfigStatus{
				isMultiValue: true,
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			actual := summarizeTiKVCollectionConfig(
				testCase.total,
				testCase.failures,
				testCase.found,
				testCase.enabled,
			)
			if actual != testCase.expected {
				t.Fatalf("expected %+v, got %+v", testCase.expected, actual)
			}
		})
	}
}
