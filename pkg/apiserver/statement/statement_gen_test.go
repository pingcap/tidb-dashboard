// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package statement

import (
	"strings"
	"testing"
)

func TestIaExecCountAvailability(t *testing.T) {
	baseColumns := []string{
		"schema_name", "digest", "sum_latency", "summary_begin_time", "summary_end_time", "exec_count",
	}

	for _, tc := range []struct {
		name      string
		columns   []string
		available bool
	}{
		{name: "supported", columns: append(append([]string{}, baseColumns...), "ia_exec_count"), available: true},
		{name: "unsupported", columns: baseColumns, available: false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			fields := filterFieldsByColumns(getFieldsAndTags(), tc.columns)
			found := false
			for _, field := range fields {
				if field.JSONName == "ia_exec_count" {
					found = true
					break
				}
			}
			if found != tc.available {
				t.Fatalf("ia_exec_count availability = %v, want %v", found, tc.available)
			}

			for _, requested := range [][]string{{"exec_count", "ia_exec_count"}, {"*"}} {
				query, err := (&Service{}).genSelectStmt(tc.columns, requested)
				if err != nil {
					t.Fatal(err)
				}
				selected := strings.Contains(query, "SUM(ia_exec_count) AS agg_ia_exec_count")
				if selected != tc.available {
					t.Fatalf("ia_exec_count selected = %v, want %v; requested: %v; query: %s", selected, tc.available, requested, query)
				}
			}
		})
	}
}
