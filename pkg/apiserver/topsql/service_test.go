// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package topsql

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin/binding"
)

func TestUpdateTikvNetworkIoCollectionRequestValidation(t *testing.T) {
	testCases := []struct {
		name           string
		body           string
		expectError    bool
		expectEnable   bool
		expectDetailed *bool
	}{
		{
			name:        "empty request",
			body:        `{}`,
			expectError: true,
		},
		{
			name:        "detailed IO only",
			body:        `{"detailed_io_enabled":true}`,
			expectError: true,
		},
		{
			name:         "disable network IO",
			body:         `{"enable":false}`,
			expectEnable: false,
		},
		{
			name:           "enable network and detailed IO",
			body:           `{"enable":true,"detailed_io_enabled":true}`,
			expectEnable:   true,
			expectDetailed: boolPointer(true),
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(testCase.body))
			req.Header.Set("Content-Type", "application/json")
			var cfg UpdateTikvNetworkIoCollectionRequest
			err := binding.JSON.Bind(req, &cfg)
			if testCase.expectError {
				if err == nil {
					t.Fatal("expected request validation to fail")
				}
				return
			}
			if err != nil {
				t.Fatalf("expected request to bind successfully, got %v", err)
			}
			if cfg.Enable == nil || *cfg.Enable != testCase.expectEnable {
				t.Fatalf("expected enable to be %v, got %v", testCase.expectEnable, cfg.Enable)
			}
			if testCase.expectDetailed == nil {
				if cfg.DetailedIoEnabled != nil {
					t.Fatalf("expected detailed_io_enabled to be omitted, got %v", *cfg.DetailedIoEnabled)
				}
			} else if cfg.DetailedIoEnabled == nil || *cfg.DetailedIoEnabled != *testCase.expectDetailed {
				t.Fatalf("expected detailed_io_enabled to be %v, got %v", *testCase.expectDetailed, cfg.DetailedIoEnabled)
			}
		})
	}
}

func boolPointer(value bool) *bool {
	return &value
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
