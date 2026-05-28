// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package materializedview

import "testing"

func TestNormalizeRefreshHistoryRequest(t *testing.T) {
	t.Run("fills defaults", func(t *testing.T) {
		req := &RefreshHistoryRequest{
			BeginTime: 1710000000,
			EndTime:   1710003600,
			Schema:    []string{"test"},
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
			Schema:    []string{"test"},
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

	t.Run("normalizes refresh methods", func(t *testing.T) {
		req := &RefreshHistoryRequest{
			BeginTime:     1710000000,
			EndTime:       1710003600,
			Schema:        []string{"test"},
			RefreshMethod: []string{" FAST AUTO ", "complete manual", "fast auto"},
		}

		if err := normalizeRefreshHistoryRequest(req); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(req.RefreshMethod) != 2 {
			t.Fatalf("unexpected refresh method length: %d", len(req.RefreshMethod))
		}
		if req.RefreshMethod[0] != "fast auto" || req.RefreshMethod[1] != "complete manual" {
			t.Fatalf("unexpected refresh methods: %#v", req.RefreshMethod)
		}
	})

	t.Run("normalizes schemas", func(t *testing.T) {
		req := &RefreshHistoryRequest{
			BeginTime: 1710000000,
			EndTime:   1710003600,
			Schema:    []string{" test ", "mysql", "test", ""},
		}

		if err := normalizeRefreshHistoryRequest(req); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(req.Schema) != 2 {
			t.Fatalf("unexpected schema length: %d", len(req.Schema))
		}
		if req.Schema[0] != "test" || req.Schema[1] != "mysql" {
			t.Fatalf("unexpected schemas: %#v", req.Schema)
		}
	})

	t.Run("rejects invalid range", func(t *testing.T) {
		req := &RefreshHistoryRequest{
			BeginTime: 1710000000,
			EndTime:   1710000000 + materializedViewMaxRangeSeconds + 1,
			Schema:    []string{"test"},
		}

		if err := normalizeRefreshHistoryRequest(req); err == nil {
			t.Fatalf("expected range validation error")
		}
	})

	t.Run("rejects invalid status", func(t *testing.T) {
		req := &RefreshHistoryRequest{
			BeginTime: 1710000000,
			EndTime:   1710003600,
			Schema:    []string{"test"},
			Status:    []string{"done"},
		}

		if err := normalizeRefreshHistoryRequest(req); err == nil {
			t.Fatalf("expected status validation error")
		}
	})

	t.Run("rejects invalid refresh method", func(t *testing.T) {
		req := &RefreshHistoryRequest{
			BeginTime:     1710000000,
			EndTime:       1710003600,
			Schema:        []string{"test"},
			RefreshMethod: []string{"incremental"},
		}

		if err := normalizeRefreshHistoryRequest(req); err == nil {
			t.Fatalf("expected refresh method validation error")
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

func TestNormalizeRefreshAlertRequest(t *testing.T) {
	t.Run("fills defaults", func(t *testing.T) {
		req := &RefreshAlertRequest{
			Schema: []string{"test"},
		}

		if err := normalizeRefreshAlertRequest(req); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if req.Page != materializedViewDefaultPage {
			t.Fatalf("unexpected page: %d", req.Page)
		}
		if req.PageSize != materializedViewDefaultPageSize {
			t.Fatalf("unexpected page size: %d", req.PageSize)
		}
		if req.OrderBy != "update_time" {
			t.Fatalf("unexpected order by: %s", req.OrderBy)
		}
		if !req.IsDesc {
			t.Fatalf("expected desc order")
		}
	})

	t.Run("normalizes schemas and materialized view", func(t *testing.T) {
		req := &RefreshAlertRequest{
			Schema:           []string{" test ", "mysql", "test", ""},
			MaterializedView: " mv_1 ",
		}

		if err := normalizeRefreshAlertRequest(req); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(req.Schema) != 2 {
			t.Fatalf("unexpected schema length: %d", len(req.Schema))
		}
		if req.Schema[0] != "test" || req.Schema[1] != "mysql" {
			t.Fatalf("unexpected schemas: %#v", req.Schema)
		}
		if req.MaterializedView != "mv_1" {
			t.Fatalf("unexpected materialized view: %s", req.MaterializedView)
		}
	})

	t.Run("rejects empty schema", func(t *testing.T) {
		req := &RefreshAlertRequest{}

		if err := normalizeRefreshAlertRequest(req); err == nil {
			t.Fatalf("expected schema validation error")
		}
	})

	t.Run("rejects invalid last success time", func(t *testing.T) {
		req := &RefreshAlertRequest{
			Schema:          []string{"test"},
			LastSuccessTime: -1,
		}

		if err := normalizeRefreshAlertRequest(req); err == nil {
			t.Fatalf("expected last_success_time validation error")
		}
	})

	t.Run("rejects invalid order by", func(t *testing.T) {
		req := &RefreshAlertRequest{
			Schema:  []string{"test"},
			OrderBy: "mv_name",
		}

		if err := normalizeRefreshAlertRequest(req); err == nil {
			t.Fatalf("expected order by validation error")
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

func TestBuildRefreshAlertOrderClause(t *testing.T) {
	tests := []struct {
		name    string
		orderBy string
		isDesc  bool
		expect  string
	}{
		{
			name:    "last success time desc",
			orderBy: "last_success_time",
			isDesc:  true,
			expect:  "last_success_time DESC",
		},
		{
			name:    "last success time asc",
			orderBy: "last_success_time",
			isDesc:  false,
			expect:  "last_success_time ASC",
		},
		{
			name:    "update time desc",
			orderBy: "update_time",
			isDesc:  true,
			expect:  "update_time DESC",
		},
		{
			name:    "update time asc",
			orderBy: "update_time",
			isDesc:  false,
			expect:  "update_time ASC",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := buildRefreshAlertOrderClause(tt.orderBy, tt.isDesc); got != tt.expect {
				t.Fatalf("unexpected order clause: %s", got)
			}
		})
	}
}
