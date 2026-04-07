// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package materializedview

import "testing"

func TestNormalizeRefreshHistoryRequest(t *testing.T) {
	t.Run("fills defaults", func(t *testing.T) {
		req := &RefreshHistoryRequest{
			BeginTime: 1710000000,
			EndTime:   1710003600,
			Schema:    "test",
		}

		if err := normalizeRefreshHistoryRequest(req); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if req.Page != materializedViewDefaultPage {
			t.Fatalf("unexpected page: %d", req.Page)
		}
		if req.PageSize != materializedViewDefaultPageSize {
			t.Fatalf("unexpected page size: %d", req.PageSize)
		}
		if req.OrderBy != "refresh_time" {
			t.Fatalf("unexpected order by: %s", req.OrderBy)
		}
		if !req.IsDesc {
			t.Fatalf("expected desc order")
		}
	})

	t.Run("normalizes statuses", func(t *testing.T) {
		req := &RefreshHistoryRequest{
			BeginTime: 1710000000,
			EndTime:   1710003600,
			Schema:    "test",
			Status:    []string{"SUCCESS", " failed ", "SUCCESS"},
		}

		if err := normalizeRefreshHistoryRequest(req); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(req.Status) != 2 {
			t.Fatalf("unexpected status length: %d", len(req.Status))
		}
		if req.Status[0] != "success" || req.Status[1] != "failed" {
			t.Fatalf("unexpected statuses: %#v", req.Status)
		}
	})

	t.Run("rejects invalid range", func(t *testing.T) {
		req := &RefreshHistoryRequest{
			BeginTime: 1710000000,
			EndTime:   1710000000 + materializedViewMaxRangeSeconds + 1,
			Schema:    "test",
		}

		if err := normalizeRefreshHistoryRequest(req); err == nil {
			t.Fatalf("expected range validation error")
		}
	})

	t.Run("rejects invalid status", func(t *testing.T) {
		req := &RefreshHistoryRequest{
			BeginTime: 1710000000,
			EndTime:   1710003600,
			Schema:    "test",
			Status:    []string{"done"},
		}

		if err := normalizeRefreshHistoryRequest(req); err == nil {
			t.Fatalf("expected status validation error")
		}
	})

	t.Run("rejects empty schema", func(t *testing.T) {
		req := &RefreshHistoryRequest{
			BeginTime: 1710000000,
			EndTime:   1710003600,
		}

		if err := normalizeRefreshHistoryRequest(req); err == nil {
			t.Fatalf("expected schema validation error")
		}
	})
}

func TestBuildRefreshHistoryOrderClause(t *testing.T) {
	tests := []struct {
		name    string
		orderBy string
		isDesc  bool
		expect  string
	}{
		{
			name:    "duration desc",
			orderBy: "refresh_duration_sec",
			isDesc:  true,
			expect:  "refresh_duration_sec DESC",
		},
		{
			name:    "duration asc",
			orderBy: "refresh_duration_sec",
			isDesc:  false,
			expect:  "refresh_duration_sec ASC",
		},
		{
			name:    "refresh start time desc",
			orderBy: "refresh_time",
			isDesc:  true,
			expect:  "refresh_time DESC",
		},
		{
			name:    "refresh start time asc",
			orderBy: "refresh_time",
			isDesc:  false,
			expect:  "refresh_time ASC",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := buildRefreshHistoryOrderClause(tt.orderBy, tt.isDesc); got != tt.expect {
				t.Fatalf("unexpected order clause: %s", got)
			}
		})
	}
}
