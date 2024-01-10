// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package slowquery

import (
	"fmt"
	"strings"

	"github.com/samber/lo"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
)

var ErrUnknownColumn = ErrNS.NewType("unknown_column")

func genSelectStmt(tableColumns []string, reqJSONColumns []string) (string, error) {
	fields := getFieldsAndTags()

	// use required fields filter when not all fields are requested
	if reqJSONColumns[0] != "*" {
		// These three fields are the most basic information of a slow query record and should contain them
		requiredFields := lo.Uniq(append(reqJSONColumns, "digest", "connection_id", "timestamp"))
		fields = lo.Filter(fields, func(f Field, _ int) bool {
			return lo.Contains(requiredFields, f.JSONName)
		})
	}

	// We have both TiDB 4.x and TiDB 5.x columns listed in the model. Filter out columns that do not exist in current version TiDB schema.
	fields = lo.Filter(fields, func(f Field, _ int) bool {
		var representedColumns []string
		if len(f.Related) != 0 {
			representedColumns = f.Related
		} else {
			representedColumns = []string{f.ColumnName}
		}
		// For compatibility with old TiDB, we need to check if the column exists in the table.
		// Dependent columns of the requested field must exist in the db schema. Otherwise, the requested field will be ignored.
		return utils.IsSubsetICaseInsensitive(tableColumns, representedColumns)
	})

	if len(fields) == 0 {
		return "", ErrUnknownColumn.New("all columns are not included in the current version TiDB schema, columns: %q", reqJSONColumns)
	}

	stmt := lo.Map(fields, func(f Field, _ int) string {
		if f.Projection == "" {
			return f.ColumnName
		}
		return fmt.Sprintf("%s AS %s", f.Projection, f.ColumnName)
	})
	return strings.Join(stmt, ", "), nil
}

func genOrderStmt(tableColumns []string, orderBy string, isDesc bool) (string, error) {
	var order string
	// to handle the special case: timestamp
	// Order by column instead of expression, see related optimization in TiDB: https://github.com/pingcap/tidb/pull/20750
	if orderBy == "timestamp" {
		order = "Time"
	} else {
		// We have both TiDB 4.x and TiDB 5.x columns listed in the model. Filter out columns that do not exist in current version TiDB schema.
		fields := lo.Filter(getFieldsAndTags(), func(f Field, _ int) bool {
			var representedColumns []string
			if len(f.Related) != 0 {
				representedColumns = f.Related
			} else {
				representedColumns = []string{f.ColumnName}
			}
			// For compatibility with old TiDB, we need to check if the column exists in the table.
			// Dependent columns of the requested field must exist in the db schema. Otherwise, the requested field will be ignored.
			return utils.IsSubsetICaseInsensitive(tableColumns, representedColumns)
		})
		orderField, ok := lo.Find(fields, func(f Field) bool {
			return f.JSONName == orderBy
		})
		if !ok {
			return "", ErrUnknownColumn.New("unknown order by %s", orderBy)
		}

		order = orderField.ColumnName
	}

	if isDesc {
		order = fmt.Sprintf("%s DESC", order)
	} else {
		order = fmt.Sprintf("%s ASC", order)
	}

	return order, nil
}
