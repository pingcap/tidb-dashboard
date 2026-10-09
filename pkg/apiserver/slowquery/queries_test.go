// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package slowquery

import (
	"encoding/json"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/utils"
)

func TestQuerySlowLogDetailReadPoolTaskDetails(t *testing.T) {
	details := "{tasks:1, poll_count:{total:2}}"
	for _, tc := range []struct {
		name      string
		hasColumn bool
		value     *string
	}{
		{name: "reported details", hasColumn: true, value: &details},
		{name: "null details", hasColumn: true},
		{name: "older schema"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			sqlDB, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer sqlDB.Close()
			db, err := gorm.Open(mysql.New(mysql.Config{
				Conn: sqlDB, SkipInitializeWithVersion: true,
			}), &gorm.Config{DisableAutomaticPing: true})
			require.NoError(t, err)
			sysSchema := utils.NewSysSchema()
			defer sysSchema.Close()

			columns := []string{"Digest"}
			selectStmt := "`Digest`"
			rows := sqlmock.NewRows(columns).AddRow("digest")
			if tc.hasColumn {
				// Column discovery is case insensitive across TiDB versions.
				columns = append(columns, "READ_POOL_TASK_DETAILS")
				selectStmt = "Digest, Read_pool_task_details"
				rows = sqlmock.NewRows([]string{"Digest", "Read_pool_task_details"}).AddRow("digest", tc.value)
			}
			schemaRows := sqlmock.NewRows([]string{"Field"})
			for _, column := range columns {
				schemaRows.AddRow(column)
			}
			mock.ExpectQuery(regexp.QuoteMeta("DESC " + SlowQueryTable)).WillReturnRows(schemaRows)
			mock.ExpectQuery(regexp.QuoteMeta("SELECT "+selectStmt+" FROM `INFORMATION_SCHEMA`.`CLUSTER_SLOW_QUERY` WHERE Digest = ? AND Time = FROM_UNIXTIME(?) AND Conn_id = ? ORDER BY `CLUSTER_SLOW_QUERY`.`Digest` LIMIT ?")).
				WithArgs("digest", float64(123), "456", 1).WillReturnRows(rows)

			result, err := QuerySlowLogDetail(&GetDetailRequest{
				Digest: "digest", Timestamp: 123, ConnectID: "456",
			}, sysSchema, db.Table(SlowQueryTable))
			require.NoError(t, err)
			require.Equal(t, tc.value, result.ReadPoolTaskDetails)
			encoded, err := json.Marshal(result)
			require.NoError(t, err)
			var response map[string]any
			require.NoError(t, json.Unmarshal(encoded, &response))
			if tc.value == nil {
				require.Contains(t, response, "read_pool_task_details")
				require.Nil(t, response["read_pool_task_details"])
			} else {
				require.Equal(t, *tc.value, response["read_pool_task_details"])
			}
			require.NoError(t, mock.ExpectationsWereMet())
		})
	}
}
