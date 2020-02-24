package diagnose_report

import (
	"database/sql"
	"fmt"
	"os"
	"strconv"
	"strings"

	_ "github.com/go-sql-driver/mysql" // mysql driver
)

type TableDef struct {
	Category  []string // The category of the table, such as [TiDB]
	Title     string
	CommentEN string   // English Comment
	CommentCN string   // Chinese comment
	Column    []string // Column name
	Rows      []TableRowDef
}

type TableRowDef struct {
	Values    []string
	SubValues [][]string // SubValues need fold default.
}

func NewTableRowDef(values []string, subValues [][]string) TableRowDef {
	return TableRowDef{
		Values:    values,
		SubValues: subValues,
	}
}

func (t TableDef) ColumnWidth() []int {
	fieldLen := make([]int, 0, len(t.Column))
	if len(t.Rows) == 0 {
		return fieldLen
	}
	for i := 0; i < len(t.Column); i++ {
		l := 0
		for _, row := range t.Rows {
			if l < len(row.Values[i]) {
				l = len(row.Values[i])
			}
			for _, subRow := range row.SubValues {
				if l < len(subRow[i]) {
					l = len(subRow[i])
				}
			}
		}
		fieldLen = append(fieldLen, l)
	}
	return fieldLen
}

func GetTotalTimeTableData(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	tables := []totalTimeTableDef{
		{name: "tidb_query", tbl: "tidb_query", label: "sql_type"},
		{name: "tidb_auto_id_request", tbl: "tidb_auto_id_request", label: "type"},
		{name: "tidb_batch_client_unavailable", tbl: "tidb_batch_client_unavailable", label: "instance"},
		{name: "tidb_batch_client_wait", tbl: "tidb_batch_client_wait", label: "instance"},
		//{name: "tidb_compile", tbl: "tidb_compile", label: "sql_type"},
		//{name: "tidb_cop", tbl: "tidb_cop", label: "instance"},
		//{name: "tidb_ddl_batch_add_index", tbl: "tidb_ddl_batch_add_index", label: "type"},
		//{name: "tidb_ddl_deploy_syncer", tbl: "tidb_ddl_deploy_syncer", label: "type"},
		//{name: "tidb_ddl", tbl: "tidb_ddl", label: "type"},
		//{name: "tidb_ddl_update_self_version", tbl: "tidb_ddl_update_self_version", label: "result"},
		//{name: "tidb_ddl_worker", tbl: "tidb_ddl_worker", label: "action"},
		//{name: "tidb_distsql_execution", tbl: "tidb_distsql_execution", label: "type"},
		//{name: "tidb_execute", tbl: "tidb_execute", label: "sql_type"},
		//{name: "tidb_gc_push_task", tbl: "tidb_gc_push_task", label: "type"},
		//{name: "tidb_gc", tbl: "tidb_gc", label: "instance"},
		//{name: "tidb_get_token", tbl: "tidb_get_token", label: "instance"},
		//{name: "tidb_kv_backoff", tbl: "tidb_kv_backoff", label: "type"},
		//{name: "tidb_kv_request", tbl: "tidb_kv_request", label: "type"},
		//{name: "tidb_load_schema", tbl: "tidb_load_schema", label: "instance"},
		//{name: "tidb_meta_operation", tbl: "tidb_meta_operation", label: "type"},
		//{name: "tidb_new_etcd_session", tbl: "tidb_new_etcd_session", label: "type"},
		//{name: "tidb_owner_handle_syncer", tbl: "tidb_owner_handle_syncer", label: "type"},
		//{name: "tidb_parse", tbl: "tidb_parse", label: "sql_type"},
		//{name: "tidb_slow_query_cop_process", tbl: "tidb_slow_query_cop_process"},
		//{name: "tidb_slow_query_cop_wait", tbl: "tidb_slow_query_cop_wait"},
		//{name: "tidb_slow_query", tbl: "tidb_slow_query"},
		//{name: "tidb_statistics_auto_analyze", tbl: "tidb_statistics_auto_analyze", label: "instance"},
		//{name: "tidb_transaction_local_latch_wait", tbl: "tidb_transaction_local_latch_wait", label: "instance"},
		//{name: "tidb_transaction", tbl: "tidb_transaction", label: "sql_type"},
		//
		//{name: "etcd_wal_fsync", tbl: "etcd_wal_fsync", label: "instance"},
		//{name: "pd_client_cmd", tbl: "pd_client_cmd", label: "type"},
		//{name: "pd_grpc_completed_commands", tbl: "pd_grpc_completed_commands", label: "grpc_method"},
		//{name: "pd_handle_request", tbl: "pd_handle_request", label: "type"},
		//{name: "pd_handle_requests", tbl: "pd_handle_requests", label: "type"},
		//{name: "pd_handle_transactions", tbl: "pd_handle_transactions", label: "result"},
		//{name: "pd_operator_finish", tbl: "pd_operator_finish", label: "type"},
		//{name: "pd_operator_step_finish", tbl: "pd_operator_step_finish", label: "type"},
		//{name: "pd_peer_round_trip", tbl: "pd_peer_round_trip", label: "To"},
		//{name: "pd_region_heartbeat", tbl: "pd_region_heartbeat", label: "address"},
		//{name: "pd_start_tso_wait", tbl: "pd_start_tso_wait", label: "instance"},
		//{name: "pd_tso_rpc", tbl: "pd_tso_rpc", label: "instance"},
		//{name: "pd_tso_wait", tbl: "pd_tso_wait", label: "instance"},
		//
		//{name: "tikv_append_log", tbl: "tikv_append_log", label: "instance"},
		//{name: "tikv_apply_log", tbl: "tikv_apply_log", label: "instance"},
		//{name: "tikv_apply_wait", tbl: "tikv_apply_wait", label: "instance"},
		//{name: "tikv_backup_range", tbl: "tikv_backup_range", label: "type"},
		//{name: "tikv_backup", tbl: "tikv_backup", label: "instance"},
		//{name: "tikv_check_split", tbl: "tikv_check_split", label: "instance"},
		//{name: "tikv_commit_log", tbl: "tikv_commit_log", label: "instance"},
		//{name: "tikv_cop_handle", tbl: "tikv_cop_handle", label: "req"},
		//{name: "tikv_cop_request", tbl: "tikv_cop_request", label: "req"},
		//{name: "tikv_cop_wait", tbl: "tikv_cop_wait", label: "req"},
		//{name: "tikv_raft_store_events", tbl: "tikv_raft_store_events", label: "type"},
		//{name: "tikv_gc_tasks", tbl: "tikv_gc_tasks", label: "task"},
		//{name: "tikv_grpc_messge", tbl: "tikv_grpc_messge", label: "type"},
		//{name: "tikv_handle_snapshot", tbl: "tikv_handle_snapshot", label: "type"},
		//{name: "tikv_ingest_sst", tbl: "tikv_ingest_sst", label: "instance"},
		//{name: "tikv_lock_manager_deadlock_detect", tbl: "tikv_lock_manager_deadlock_detect", label: "instance"},
		//{name: "tikv_lock_manager_waiter_lifetime", tbl: "tikv_lock_manager_waiter_lifetime", label: "instance"},
		//{name: "tikv_process", tbl: "tikv_process", label: "type"},
		//{name: "tikv_propose_wait", tbl: "tikv_propose_wait", label: "instance"},
		//{name: "tikv_scheduler_command", tbl: "tikv_scheduler_command", label: "type"},
		//{name: "tikv_scheduler_latch_wait", tbl: "tikv_scheduler_latch_wait", label: "type"},
		//{name: "tikv_send_snapshot", tbl: "tikv_send_snapshot", label: "instance"},
		//{name: "tikv_storage_async_request", tbl: "tikv_storage_async_request", label: "type"},
	}

	resultRows := make([]TableRowDef, 0, len(tables))

	quantiles := []float64{0.999, 0.99, 0.90, 0.80}
	totalTime := float64(0)

	specialHandle := func(row []string) []string {
		name := row[0]
		if strings.HasSuffix(name, "(us)") {
			if len(row[4]) == 0 {
				return row
			}
			for i := range []int{3, 4, 6, 7, 8, 9} {
				v, err := strconv.ParseFloat(row[i], 64)
				if err == nil {
					row[i] = fmt.Sprintf("%f", v/10e5)
				}
			}
			row[0] = name[:len(name)-4]
		}
		return row
	}

	appendRows := func(row TableRowDef) {
		row.Values = specialHandle(row.Values)
		for i := range row.SubValues {
			row.SubValues[i] = specialHandle(row.SubValues[i])
		}
		resultRows = append(resultRows, row)
	}

	table := &TableDef{
		Category:  []string{"Overview"},
		Title:     "Time Consume",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"METRIC_NAME", "TIME", "LABEL", "TIME_RATIO", "TOTAL_TIME", "TOTAL_COUNT", "P999", "P99", "P90", "P80"},
	}
	for ti, t := range tables {
		sql := t.genSumarySQLs(totalTime, startTime, endTime, quantiles)
		rows, err := querySQL(db, sql)
		if err != nil {
			return nil, err
		}
		if len(rows) == 0 {
			continue
		}
		if ti == 0 {
			totalTime, err = strconv.ParseFloat(rows[0][4], 64)
			if err != nil {
				return nil, err
			}
			fmt.Printf("total_time: %v   -------\n", totalTime)
		}
		if len(rows) != 1 {
			// should never happen.
			continue
		}

		if len(t.label) == 0 {
			appendRows(NewTableRowDef(rows[0], nil))
			continue
		}
		sql = t.genDetailSQLs(totalTime, startTime, endTime, quantiles)
		subRows, err := querySQL(db, sql)
		if err != nil {
			return nil, err
		}
		appendRows(NewTableRowDef(rows[0], subRows))
	}
	table.Rows = resultRows
	return table, nil
}

func querySQL(db *sql.DB, sql string) ([][]string, error) {
	if len(sql) == 0 {
		return nil, nil
	}
	rows, err := db.Query(sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	// Read all rows.
	resultRows := make([][]string, 0, 2)
	for rows.Next() {
		cols, err1 := rows.Columns()
		if err1 != nil {
			return nil, err
		}

		// See https://stackoverflow.com/questions/14477941/read-select-columns-into-string-in-go
		rawResult := make([][]byte, len(cols))
		dest := make([]interface{}, len(cols))
		for i := range rawResult {
			dest[i] = &rawResult[i]
		}

		err1 = rows.Scan(dest...)
		if err1 != nil {
			return nil, err
		}

		resultRow := []string{}
		for _, raw := range rawResult {
			val := ""
			if raw != nil {
				val = string(raw)
			}

			resultRow = append(resultRow, val)
		}
		resultRows = append(resultRows, resultRow)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	return resultRows, nil

}

type totalTimeTableDef struct {
	name  string
	tbl   string
	label string
}

// Table schema
//+-------------------+---------------------+-------+-------------------+------------------+------------------+--------------------+-------------------+-------------------+-------------------+
//| METRIC_NAME       | TIME                | LABEL | TIME_RATIO        | TOTAL_TIME       | TOTAL_COUNT      | P999               | P99               | P90               | P80               |
//+-------------------+---------------------+-------+-------------------+------------------+------------------+--------------------+-------------------+-------------------+-------------------+
func (t totalTimeTableDef) genSumarySQLs(totalTime float64, startTime, endTime string, quantiles []float64) string {
	sqls := []string{
		fmt.Sprintf("select '%[1]s', min(time),'', if(%[2]v>0,sum(value)/%[2]v,1) , sum(value) from metrics_schema.%[3]s_total_time where time >= '%[4]s' and time < '%[5]s'",
			t.name, totalTime, t.tbl, startTime, endTime),
		fmt.Sprintf("select sum(value) from metrics_schema.%s_total_count where time >= '%s' and time < '%s'",
			t.tbl, startTime, endTime),
	}
	for _, quantile := range quantiles {
		sql := fmt.Sprintf("select max(value) as max_value from metrics_schema.%s_duration where time >= '%s' and time < '%s' and quantile=%f",
			t.tbl, startTime, endTime, quantile)
		sqls = append(sqls, sql)
	}
	fields := ""
	tbls := ""
	for i, sql := range sqls {
		if i > 0 {
			fields += ","
			tbls += "join "
		}
		fields += fmt.Sprintf("t%v.*", i)
		tbls += fmt.Sprintf(" (%s) as t%v ", sql, i)
	}
	joinSql := fmt.Sprintf("select %v from %v", fields, tbls)
	return joinSql
}

// Table schema
//+-------------------+---------------------+-------+-------------------+------------------+------------------+--------------------+-------------------+-------------------+-------------------+
//| METRIC_NAME       | TIME                | LABEL | TIME_RATIO        | TOTAL_TIME       | TOTAL_COUNT      | P999               | P99               | P90               | P80               |
//+-------------------+---------------------+-------+-------------------+------------------+------------------+--------------------+-------------------+-------------------+-------------------+
func (t totalTimeTableDef) genDetailSQLs(totalTime float64, startTime, endTime string, quantiles []float64) string {
	if len(t.label) == 0 {
		return ""
	}
	joinSql := "select t0.*,t1.count"
	sqls := []string{
		fmt.Sprintf("select '%[1]s', min(time), `%[6]s`, if(%[2]v>0,sum(value)/%[2]v,1) , sum(value) as total from metrics_schema.%[3]s_total_time where time >= '%[4]s' and time < '%[5]s' group by `%[6]s`",
			t.name, totalTime, t.tbl, startTime, endTime, t.label),
		fmt.Sprintf("select `%[4]s`, sum(value) as count from metrics_schema.%[1]s_total_count where time >= '%[2]s' and time < '%[3]s' group by `%[4]s`",
			t.tbl, startTime, endTime, t.label),
	}
	for i, quantile := range quantiles {
		sql := fmt.Sprintf("select `%[5]s`, max(value) as max_value from metrics_schema.%[1]s_duration where time >= '%[2]s' and time < '%[3]s' and quantile=%[4]f group by `%[5]s`",
			t.tbl, startTime, endTime, quantile, t.label)
		sqls = append(sqls, sql)
		joinSql += fmt.Sprintf(",t%v.max_value", i+2)
	}
	joinSql += " from "
	for i, sql := range sqls {
		joinSql += fmt.Sprintf(" (%s) as t%v ", sql, i)
		if i != len(sqls)-1 {
			joinSql += "join "
		}
	}
	joinSql += " where "
	for i := 0; i < len(sqls)-1; i++ {
		if i > 0 {
			joinSql += "and "
		}
		joinSql += fmt.Sprintf(" t%v.%s = t%v.%s ", i, t.label, i+1, t.label)
	}
	joinSql += " order by t0.total desc"
	return joinSql
}

func checkErr(err error) {
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
