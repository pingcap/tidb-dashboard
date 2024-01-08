// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package statement

import (
	"fmt"
	"strings"

	"github.com/samber/lo"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/distro"
)

var ErrUnknownColumn = ErrNS.NewType("unknown_column")

func (s *Service) genSelectStmt(tableColumns []string, reqJSONColumns []string) (string, error) {
	fields := getFieldsAndTags()

	// use required fields filter when not all fields are requested
	if reqJSONColumns[0] != "*" {
		requiredFields := lo.Uniq(append(reqJSONColumns,
			"schema_name", "digest", // required by group by
			"sum_latency", // required by order
			"summary_begin_time", "summary_end_time",
		))
		fields = lo.Filter(fields, func(f Field, _ int) bool {
			return lo.Contains(requiredFields, f.JSONName)
		})
	}

	// Filter out columns that do not exist in current version TiDB schema.
	// Current version TiDB schema columns are passed in by `tableColumns`.
	fields = lo.Filter(fields, func(f Field, _ int) bool {
		var representedColumns []string
		if len(f.Related) != 0 {
			representedColumns = f.Related
		} else {
			representedColumns = []string{f.JSONName}
		}

		// Dependent columns of the requested field must exist in the db schema. Otherwise, the requested field will be ignored.
		return utils.IsSubsetICaseInsensitive(tableColumns, representedColumns)
	})

	if len(fields) == 0 {
		return "", ErrUnknownColumn.New("all columns are not included in the current version %s schema, columns: %q", distro.R().TiDB, reqJSONColumns)
	}

	stmt := lo.Map(fields, func(f Field, _ int) string {
		if f.Aggregation == "" {
			return f.JSONName
		}
		return fmt.Sprintf("%s AS %s", f.Aggregation, f.ColumnName)
	})
	return strings.Join(stmt, ", "), nil
}
