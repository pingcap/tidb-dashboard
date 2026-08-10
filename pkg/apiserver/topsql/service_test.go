// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package topsql

import "testing"

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
