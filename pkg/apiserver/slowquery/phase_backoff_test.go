// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package slowquery

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	apiUtils "github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/utils"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

func TestPhaseBackoffProjection(t *testing.T) {
	columns := []string{"Digest", "Conn_ID", "Time", "Backoff_types", "Prewrite_backoff_types", "Commit_backoff_types"}
	projection, err := genSelectStmt(columns, []string{"prewrite_backoff_types", "commit_backoff_types"})
	require.NoError(t, err)
	require.Contains(t, projection, "Prewrite_backoff_types")
	require.Contains(t, projection, "Commit_backoff_types")
	require.NotContains(t, projection, "Backoff_types,")
}

var testPhaseColumns = []string{"INSTANCE", "Time", "Digest", "Conn_ID", "Backoff_types", "Query", "Prewrite_backoff_types", "Commit_backoff_types"}

func phaseTestDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock, *utils.SysSchema) {
	t.Helper()
	conn, mock, err := sqlmock.New()
	require.NoError(t, err)
	db, err := gorm.Open(mysql.New(mysql.Config{Conn: conn, SkipInitializeWithVersion: true}), &gorm.Config{DisableAutomaticPing: true})
	require.NoError(t, err)
	schema := utils.NewSysSchema()
	t.Cleanup(func() {
		require.NoError(t, mock.ExpectationsWereMet())
		_ = conn.Close()
		require.NoError(t, schema.Close())
	})
	return db.Table(SlowQueryTable), mock, schema
}

func expectPhaseSchema(mock sqlmock.Sqlmock, columns []string, probeErr error) {
	rows := sqlmock.NewRows([]string{"Field"})
	for _, column := range columns {
		rows.AddRow(column)
	}
	mock.ExpectQuery(regexp.QuoteMeta("DESC " + SlowQueryTable)).WillReturnRows(rows)
	var phases []string
	for _, column := range columns {
		if isPhaseColumn(column) {
			phases = append(phases, column)
		}
	}
	if len(phases) != 0 {
		probe := mock.ExpectQuery(regexp.QuoteMeta("SELECT " + strings.Join(phases, ", ") + " FROM " + SlowQueryTable +
			" WHERE Time BETWEEN '2100-01-01 00:00:00' AND '2100-01-01 00:00:01'"))
		if probeErr != nil {
			probe.WillReturnError(probeErr)
		} else {
			probe.WillReturnRows(sqlmock.NewRows(phases))
		}
	}
}

func TestPhaseBackoffValues(t *testing.T) {
	for _, value := range []string{"", "[]", "[txnLock txnLock FutureType]", "[" + strings.Repeat("FutureType ", 200) + "]"} {
		t.Run(fmt.Sprintf("length-%d", len(value)), func(t *testing.T) {
			db, mock, schema := phaseTestDB(t)
			expectPhaseSchema(mock, testPhaseColumns, nil)
			mock.ExpectQuery("SELECT .*Prewrite_backoff_types, Commit_backoff_types.*ORDER BY Time ASC LIMIT").WithArgs(100).
				WillReturnRows(sqlmock.NewRows([]string{"Backoff_types", "Prewrite_backoff_types", "Commit_backoff_types"}).AddRow("legacy", value, value))
			rows, err := QuerySlowLogList(&GetListRequest{Fields: "*"}, schema, db)
			require.NoError(t, err)
			require.Len(t, rows, 1)
			require.Equal(t, "legacy", rows[0].BackoffTypes)
			require.Equal(t, &value, rows[0].PrewriteBackoffTypes)
			require.Equal(t, &value, rows[0].CommitBackoffTypes)
			encoded, err := json.Marshal(rows[0])
			require.NoError(t, err)
			var decoded map[string]any
			require.NoError(t, json.Unmarshal(encoded, &decoded))
			require.Equal(t, value, decoded["prewrite_backoff_types"])
		})
	}
}

func TestPhaseBackoffOldAndMixedReaders(t *testing.T) {
	for _, mixed := range []bool{false, true} {
		t.Run(fmt.Sprint(mixed), func(t *testing.T) {
			db, mock, schema := phaseTestDB(t)
			columns := withoutPhaseColumns(testPhaseColumns)
			if mixed {
				expectPhaseSchema(mock, testPhaseColumns, errors.New("Column ID 7 of table cluster_slow_query not found"))
			} else {
				expectPhaseSchema(mock, columns, nil)
			}
			projection, err := genSelectStmt(columns, []string{"*"})
			require.NoError(t, err)
			mock.ExpectQuery(regexp.QuoteMeta("SELECT " + projection)).WithArgs(100).
				WillReturnRows(sqlmock.NewRows([]string{"Backoff_types"}).AddRow("[txnLock]"))
			rows, err := QuerySlowLogList(&GetListRequest{Fields: "*"}, schema, db)
			require.NoError(t, err)
			require.Len(t, rows, 1)
			require.Equal(t, "[txnLock]", rows[0].BackoffTypes)
			require.Nil(t, rows[0].PrewriteBackoffTypes)
			require.Nil(t, rows[0].CommitBackoffTypes)
			encoded, err := json.Marshal(rows[0])
			require.NoError(t, err)
			require.Contains(t, string(encoded), `"prewrite_backoff_types":null`)
		})
	}
}

func TestPhaseBackoffConditions(t *testing.T) {
	empty := ""
	for _, req := range []*GetListRequest{
		{Fields: "*", OrderBy: "prewrite_backoff_types"},
		{Fields: "digest", PrewriteBackoffTypes: &empty},
		{Fields: "digest", CommitBackoffTypes: &empty},
	} {
		db, mock, schema := phaseTestDB(t)
		expectPhaseSchema(mock, testPhaseColumns, errors.New("Column ID 8 of table cluster_slow_query not found"))
		_, err := QuerySlowLogList(req, schema, db)
		require.Error(t, err)
		require.Contains(t, err.Error(), "error.api.slow_query.unknown_column")
	}
	db, mock, schema := phaseTestDB(t)
	expectPhaseSchema(mock, testPhaseColumns, nil)
	mock.ExpectQuery("SELECT .*WHERE Prewrite_backoff_types = . AND Commit_backoff_types = . ORDER BY Commit_backoff_types DESC LIMIT").
		WithArgs(empty, "[txnLock txnLock]", 100).WillReturnRows(sqlmock.NewRows([]string{"Digest"}))
	_, err := QuerySlowLogList(&GetListRequest{
		Fields: "digest", PrewriteBackoffTypes: &empty,
		CommitBackoffTypes: ptrString("[txnLock txnLock]"), OrderBy: "commit_backoff_types", IsDesc: true,
	}, schema, db)
	require.NoError(t, err)
}

func ptrString(value string) *string { return &value }

func TestPhaseBackoffCapabilityRefresh(t *testing.T) {
	db, mock, schema := phaseTestDB(t)
	for _, columns := range [][]string{testPhaseColumns, withoutPhaseColumns(testPhaseColumns), testPhaseColumns} {
		expectPhaseSchema(mock, columns, nil)
		fields, err := GetAvailableFields(schema, db)
		require.NoError(t, err)
		require.Equal(t, len(columns) == len(testPhaseColumns), strings.Contains(strings.Join(fields, ","), "prewrite_backoff_types"))
	}
}

func TestPhaseBackoffQueryRace(t *testing.T) {
	db, mock, schema := phaseTestDB(t)
	expectPhaseSchema(mock, testPhaseColumns, nil)
	mock.ExpectQuery("SELECT .*Prewrite_backoff_types, Commit_backoff_types").WithArgs(100).
		WillReturnError(errors.New("Column ID 7 of table cluster_slow_query not found"))
	projection, err := genSelectStmt(withoutPhaseColumns(testPhaseColumns), []string{"*"})
	require.NoError(t, err)
	mock.ExpectQuery(regexp.QuoteMeta("SELECT " + projection)).WithArgs(100).
		WillReturnRows(sqlmock.NewRows([]string{"Digest"}).AddRow("digest"))
	rows, err := QuerySlowLogList(&GetListRequest{Fields: "*"}, schema, db)
	require.NoError(t, err)
	require.Len(t, rows, 1)
	require.Nil(t, rows[0].PrewriteBackoffTypes)
}

func TestPhaseBackoffUnrelatedErrors(t *testing.T) {
	for _, failure := range []error{errors.New("connection timeout"), errors.New("Column ID 4 of table cluster_slow_query not found"), errors.New("Column ID 7 of table another_table not found")} {
		db, mock, schema := phaseTestDB(t)
		expectPhaseSchema(mock, testPhaseColumns, failure)
		_, err := QuerySlowLogList(&GetListRequest{Fields: "*"}, schema, db)
		require.ErrorIs(t, err, failure)
	}
}

func TestPhaseBackoffCSV(t *testing.T) {
	long := "[" + strings.Repeat("FutureType ", 200) + "]"
	empty := ""
	rows := apiUtils.GenerateCSVFromRaw([]interface{}{
		Model{PrewriteBackoffTypes: &long, CommitBackoffTypes: &empty},
		Model{},
	}, []string{"prewrite_backoff_types", "commit_backoff_types"}, nil)
	require.Equal(t, []string{long, ""}, rows[1])
	require.Equal(t, []string{"NULL", "NULL"}, rows[2])
}

func TestPhaseBackoffHTTP(t *testing.T) {
	for _, unsupported := range []bool{false, true} {
		t.Run(fmt.Sprint(unsupported), func(t *testing.T) {
			db, mock, schema := phaseTestDB(t)
			path := "/list?fields=prewrite_backoff_types,commit_backoff_types"
			if unsupported {
				expectPhaseSchema(mock, withoutPhaseColumns(testPhaseColumns), nil)
				path += "&prewrite_backoff_types="
			} else {
				expectPhaseSchema(mock, testPhaseColumns, nil)
				mock.ExpectQuery("SELECT .*Prewrite_backoff_types, Commit_backoff_types").WithArgs(100).
					WillReturnRows(sqlmock.NewRows([]string{"Prewrite_backoff_types", "Commit_backoff_types"}).AddRow("", "[txnLock txnLock]"))
			}
			s := newService(ServiceParams{SysSchema: schema})
			router := gin.New()
			router.Use(rest.ErrorHandlerFn(), func(c *gin.Context) { c.Set("tidb", db) })
			router.GET("/list", s.getList)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
			if unsupported {
				require.Equal(t, http.StatusBadRequest, response.Code)
				require.Contains(t, response.Body.String(), "unavailable")
			} else {
				require.Equal(t, http.StatusOK, response.Code)
				require.Contains(t, response.Body.String(), `"prewrite_backoff_types":""`)
				require.Contains(t, response.Body.String(), `"commit_backoff_types":"[txnLock txnLock]"`)
			}
		})
	}
}
