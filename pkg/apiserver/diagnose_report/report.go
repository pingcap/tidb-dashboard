package diagnose_report

import (
	"database/sql"
	"fmt"
	"strconv"
	"strings"

	_ "github.com/go-sql-driver/mysql" // mysql driver
	"github.com/pingcap/errors"
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
		for _, col := range t.Column {
			if l < len(col) {
				l = len(col)
			}
		}
		fieldLen = append(fieldLen, l)
	}
	return fieldLen
}

const (
	// Category names.
	CategoryHeader   = "header"
	CategoryDiagnose = "diagnose"
	CategoryNode     = "node"
	CategoryOverview = "overview"
	CategoryTiDB     = "TiDB"
	CategoryPD       = "PD"
	CategoryTiKV     = "TiKV"

	// Table name.

	TableTimeConsume = "time-consume"
	TableError       = "error"
	TableTxn         = "transaction"
	TableDDLOwner    = "DDL-owner"
)

func GetTableRows(category, table, startTime, endTime string, db *sql.DB) (*TableDef, error) {
	switch category {
	case CategoryOverview:
		switch table {
		case TableTimeConsume:
			return GetTotalTimeConsumeTable(startTime, endTime, db)
		case TableError:
			return GetTotalErrorTable(startTime, endTime, db)
		}
	case CategoryTiDB:
		switch table {
		case TableTxn:
			return GetTiDBTxnTableData(startTime, endTime, db)
		case TableDDLOwner:
			return GetTiDBDDLOwner(startTime, endTime, db)
		}

	}
	return nil, errors.Errorf("unknow category %v table %v", category, table)
}

func GetTotalTimeConsumeTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	defs1 := []totalTimeTableDef{
		{name: "tidb_query", tbl: "tidb_query", label: "sql_type"},
		{name: "tidb_get_token", tbl: "tidb_get_token", label: "instance"},
		{name: "tidb_parse", tbl: "tidb_parse", label: "sql_type"},
		{name: "tidb_compile", tbl: "tidb_compile", label: "sql_type"},
		{name: "tidb_execute", tbl: "tidb_execute", label: "sql_type"},
		{name: "tidb_distsql_execution", tbl: "tidb_distsql_execution", label: "type"},
		{name: "tidb_cop", tbl: "tidb_cop", label: "instance"},
		{name: "tidb_transaction_local_latch_wait", tbl: "tidb_transaction_local_latch_wait", label: "instance"},
		{name: "tidb_transaction", tbl: "tidb_transaction", label: "sql_type"},
		{name: "tidb_kv_backoff", tbl: "tidb_kv_backoff", label: "type"},
		{name: "tidb_kv_request", tbl: "tidb_kv_request", label: "type"},
		{name: "tidb_slow_query", tbl: "tidb_slow_query"},
		{name: "tidb_slow_query_cop_process", tbl: "tidb_slow_query_cop_process"},
		{name: "tidb_slow_query_cop_wait", tbl: "tidb_slow_query_cop_wait"},
		{name: "tidb_ddl_batch_add_index", tbl: "tidb_ddl_batch_add_index", label: "type"},
		{name: "tidb_ddl_deploy_syncer", tbl: "tidb_ddl_deploy_syncer", label: "type"},
		{name: "tidb_ddl", tbl: "tidb_ddl", label: "type"},
		{name: "tidb_ddl_update_self_version", tbl: "tidb_ddl_update_self_version", label: "result"},
		{name: "tidb_ddl_worker", tbl: "tidb_ddl_worker", label: "action"},
		{name: "tidb_owner_handle_syncer", tbl: "tidb_owner_handle_syncer", label: "type"},
		{name: "tidb_new_etcd_session", tbl: "tidb_new_etcd_session", label: "type"},
		{name: "tidb_load_schema", tbl: "tidb_load_schema", label: "instance"},
		{name: "tidb_meta_operation", tbl: "tidb_meta_operation", label: "type"},
		{name: "tidb_auto_id_request", tbl: "tidb_auto_id_request", label: "type"},
		{name: "tidb_statistics_auto_analyze", tbl: "tidb_statistics_auto_analyze", label: "instance"},
		{name: "tidb_gc_push_task", tbl: "tidb_gc_push_task", label: "type"},
		{name: "tidb_gc", tbl: "tidb_gc", label: "instance"},
		{name: "tidb_batch_client_unavailable", tbl: "tidb_batch_client_unavailable", label: "instance"},
		{name: "tidb_batch_client_wait", tbl: "tidb_batch_client_wait", label: "instance"},
		// PD
		{name: "pd_start_tso_wait", tbl: "pd_start_tso_wait", label: "instance"},
		{name: "pd_tso_rpc", tbl: "pd_tso_rpc", label: "instance"},
		{name: "pd_tso_wait", tbl: "pd_tso_wait", label: "instance"},
		{name: "pd_client_cmd", tbl: "pd_client_cmd", label: "type"},
		{name: "pd_handle_request", tbl: "pd_handle_request", label: "type"},
		{name: "pd_grpc_completed_commands", tbl: "pd_grpc_completed_commands", label: "grpc_method"},
		{name: "pd_operator_finish", tbl: "pd_operator_finish", label: "type"},
		{name: "pd_operator_step_finish", tbl: "pd_operator_step_finish", label: "type"},
		{name: "pd_handle_transactions", tbl: "pd_handle_transactions", label: "result"},
		{name: "pd_peer_round_trip", tbl: "pd_peer_round_trip", label: "To"},
		{name: "pd_region_heartbeat", tbl: "pd_region_heartbeat", label: "address"},
		{name: "etcd_wal_fsync", tbl: "etcd_wal_fsync", label: "instance"},
		// TiKV
		{name: "tikv_grpc_messge", tbl: "tikv_grpc_messge", label: "type"},
		{name: "tikv_append_log", tbl: "tikv_append_log", label: "instance"},
		{name: "tikv_apply_log", tbl: "tikv_apply_log", label: "instance"},
		{name: "tikv_apply_wait", tbl: "tikv_apply_wait", label: "instance"},
		{name: "tikv_check_split", tbl: "tikv_check_split", label: "instance"},
		{name: "tikv_commit_log", tbl: "tikv_commit_log", label: "instance"},
		{name: "tikv_cop_handle", tbl: "tikv_cop_handle", label: "req"},
		{name: "tikv_cop_request", tbl: "tikv_cop_request", label: "req"},
		{name: "tikv_cop_wait", tbl: "tikv_cop_wait", label: "req"},
		{name: "tikv_process", tbl: "tikv_process", label: "type"},
		{name: "tikv_propose_wait", tbl: "tikv_propose_wait", label: "instance"},
		{name: "tikv_scheduler_command", tbl: "tikv_scheduler_command", label: "type"},
		{name: "tikv_scheduler_latch_wait", tbl: "tikv_scheduler_latch_wait", label: "type"},
		{name: "tikv_raft_store_events", tbl: "tikv_raft_store_events", label: "type"},
		{name: "tikv_handle_snapshot", tbl: "tikv_handle_snapshot", label: "type"},
		{name: "tikv_lock_manager_deadlock_detect", tbl: "tikv_lock_manager_deadlock_detect", label: "instance"},
		{name: "tikv_lock_manager_waiter_lifetime", tbl: "tikv_lock_manager_waiter_lifetime", label: "instance"},
		{name: "tikv_send_snapshot", tbl: "tikv_send_snapshot", label: "instance"},
		{name: "tikv_storage_async_request", tbl: "tikv_storage_async_request", label: "type"},
		{name: "tikv_ingest_sst", tbl: "tikv_ingest_sst", label: "instance"},
		{name: "tikv_gc_tasks", tbl: "tikv_gc_tasks", label: "task"},
		{name: "tikv_backup_range", tbl: "tikv_backup_range", label: "type"},
		{name: "tikv_backup", tbl: "tikv_backup", label: "instance"},
	}

	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	table := &TableDef{
		Category:  []string{"Overview"},
		Title:     "Time Consume",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"METRIC_NAME", "LABEL", "TIME_RATIO", "TOTAL_TIME", "TOTAL_COUNT", "P999", "P99", "P90", "P80"},
	}

	resultRows := make([]TableRowDef, 0, len(defs))
	arg := newQueryArg(startTime, endTime)
	specialHandle := func(row []string) []string {
		name := row[0]
		if strings.HasSuffix(name, "(us)") {
			if len(row[3]) == 0 {
				return row
			}
			for i := range []int{2, 3, 5, 6, 7, 8} {
				v, err := strconv.ParseFloat(row[i], 64)
				if err == nil {
					row[i] = fmt.Sprintf("%f", v/10e5)
				}
			}
			row[0] = name[:len(name)-4]
		}
		if len(row[4]) > 0 {
			row[4] = convertFloatToInt(row[4])
		}
		for _, i := range []int{2, 3, 5, 6, 7, 8} {
			row[i] = RoundFloatString(row[i])
		}
		if arg.totalTime == 0 && len(row[3]) > 0 {
			totalTime, err := strconv.ParseFloat(row[3], 64)
			if err == nil {
				arg.totalTime = totalTime
			}
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

	err := getTableRows(defs, arg, db, appendRows)
	if err != nil {
		return nil, err
	}
	table.Rows = resultRows
	return table, nil
}

func GetTotalCountTableData(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	defs1 := []totalValueAndTotalCountTableDef{
		{name: "tidb_transaction_retry_num", tbl: "tidb_transaction_retry_num", sumTbl: "tidb_transaction_retry_total_num", countTbl: "tidb_transaction_retry_num_total_count", label: "instance"},
		{name: "tidb_transaction_statement_num", tbl: "tidb_transaction_statement_num", sumTbl: "tidb_transaction_statement_total_num", countTbl: "tidb_transaction_statement_num_total_count", label: "sql_type"},
		{name: "tidb_txn_region_num", tbl: "tidb_txn_region_num", sumTbl: "tidb_txn_region_total_num", countTbl: "tidb_txn_region_num_total_count", label: "instance"},
		{name: "tidb_kv_write_num", tbl: "tidb_kv_write_num", sumTbl: "tidb_kv_write_total_num", countTbl: "tidb_kv_write_num_total_count", label: "instance"},
		{name: "tidb_kv_write_size", tbl: "tidb_kv_write_size", sumTbl: "tidb_kv_write_total_size", countTbl: "tidb_kv_write_size_total_count", label: "instance"},
		{name: "tidb_distsql_partial_num", tbl: "tidb_distsql_partial_num", sumTbl: "tidb_distsql_partial_total_num", countTbl: "tidb_distsql_partial_num_total_count", label: "instance"},
		{name: "tidb_distsql_partial_scan_key_num", tbl: "tidb_distsql_partial_scan_key_num", sumTbl: "tidb_distsql_partial_scan_key_total_num", countTbl: "tidb_distsql_partial_scan_key_num_total_count", label: "instance"},
		{name: "tidb_distsql_scan_key_num", tbl: "tidb_distsql_scan_key_num", sumTbl: "tidb_distsql_scan_key_total_num", countTbl: "tidb_distsql_scan_key_num_total_count", label: "instance"},
		{name: "tidb_statistics_fast_analyze_status", tbl: "tidb_statistics_fast_analyze_status", sumTbl: "tidb_statistics_fast_analyze_total_status", countTbl: "tidb_statistics_fast_analyze_status_total_count", label: "type"},
		{name: "tidb_statistics_stats_inaccuracy_rate", tbl: "tidb_statistics_stats_inaccuracy_rate", sumTbl: "tidb_statistics_stats_inaccuracy_total_rate", countTbl: "tidb_statistics_stats_inaccuracy_rate_total_count", label: "instance"},

		{name: "tikv_approximate_region_size", tbl: "tikv_approximate_region_size", sumTbl: "tikv_approximate_region_total_size", countTbl: "tikv_approximate_region_size_total_count", label: "instance"},
		{name: "tikv_cop_kv_cursor_operations", tbl: "tikv_cop_kv_cursor_operations", sumTbl: "tikv_cop_kv_cursor_total_operations", countTbl: "tikv_cop_kv_cursor_operations_total_count", label: "req"},
		{name: "tikv_grpc_req_batch_size", tbl: "tikv_grpc_req_batch_size", sumTbl: "tikv_grpc_req_batch_total_size", countTbl: "tikv_grpc_req_batch_size_total_count", label: "instance"},
		{name: "tikv_grpc_resp_batch_size", tbl: "tikv_grpc_resp_batch_size", sumTbl: "tikv_grpc_resp_batch_total_size", countTbl: "tikv_grpc_resp_batch_size_total_count", label: "instance"},
		{name: "tikv_raft_message_batch_size", tbl: "tikv_raft_message_batch_size", sumTbl: "tikv_raft_message_batch_total_size", countTbl: "tikv_raft_message_batch_size_total_count", label: "instance"},
		{name: "tikv_raft_proposals_per_ready", tbl: "tikv_raft_proposals_per_ready", sumTbl: "tikv_raft_proposals_per_total_ready", countTbl: "tikv_raft_proposals_per_ready_total_count", label: "instance"},
		{name: "tikv_request_batch_ratio", tbl: "tikv_request_batch_ratio", sumTbl: "tikv_request_batch_total_ratio", countTbl: "tikv_request_batch_ratio_total_count", label: "type"},
		{name: "tikv_request_batch_size", tbl: "tikv_request_batch_size", sumTbl: "tikv_request_batch_total_size", countTbl: "tikv_request_batch_size_total_count", label: "type"},
		{name: "tikv_scheduler_keys_read", tbl: "tikv_scheduler_keys_read", sumTbl: "tikv_scheduler_keys_total_read", countTbl: "tikv_scheduler_keys_read_total_count", label: "type"},
		{name: "tikv_scheduler_keys_written", tbl: "tikv_scheduler_keys_written", sumTbl: "tikv_scheduler_keys_total_written", countTbl: "tikv_scheduler_keys_written_total_count", label: "type"},
		{name: "tikv_snapshot_kv_count", tbl: "tikv_snapshot_kv_count", sumTbl: "tikv_snapshot_kv_total_count", countTbl: "tikv_snapshot_kv_count_total_count", label: "instance"},
		{name: "tikv_snapshot_size", tbl: "tikv_snapshot_size", sumTbl: "tikv_snapshot_total_size", countTbl: "tikv_snapshot_size_total_count", label: "instance"},
		{name: "tikv_backup_range_size", tbl: "tikv_backup_range_size", sumTbl: "tikv_backup_range_total_size", countTbl: "tikv_backup_range_size_total_count", label: "instance"},
	}

	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	resultRows := make([]TableRowDef, 0, len(defs))

	quantiles := []float64{0.999, 0.99, 0.90, 0.80}
	table := &TableDef{
		Category:  []string{"Overview"},
		Title:     "Time Consume",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"METRIC_NAME", "LABEL", "TOTAL_VALUE", "TOTAL_COUNT", "P999", "P99", "P90", "P80"},
	}

	specialHandle := func(row []string) []string {
		for i := 2; i < len(row); i++ {
			if len(row[i]) == 0 {
				continue
			}
			row[i] = convertFloatToInt(row[i])
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

	arg := &queryArg{
		startTime: startTime,
		endTime:   endTime,
		quantiles: quantiles,
	}

	err := getTableRows(defs, arg, db, appendRows)
	if err != nil {
		return nil, err
	}
	table.Rows = resultRows
	return table, nil
}

func GetTotalErrorTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	defs1 := []sumValueQuery{
		{tbl: "tidb_binlog_error_total_count", label: "instance"},
		{tbl: "tidb_handshake_error_total_count", label: "instance"},
		{tbl: "tidb_transaction_retry_error_total_count", label: "sql_type"},
		{tbl: "tidb_kv_region_error_total_count", label: "type"},
		{tbl: "tidb_schema_lease_error_total_count", label: "instance"},
		{tbl: "tikv_grpc_error_total_count", label: "type"},
		{tbl: "tikv_critical_error_total_count", label: "type"},
		{tbl: "tikv_scheduler_is_busy_total_count", label: "type"},
		{tbl: "tikv_channel_full_total_count", label: "type"},
		{tbl: "tikv_coprocessor_is_busy_total_count", label: "instance"},
		{tbl: "tikv_engine_write_stall", label: "instance"},
		{tbl: "tikv_server_report_failures_total_count", label: "instance"},
		{tbl: "tikv_coprocessor_request_error_total_count", label: "reason"},
		{tbl: "tikv_lock_manager_detect_error_total_count", label: "type"},
		{tbl: "tikv_backup_errors_total_count", label: "error"},
		{tbl: "node_network_in_errors_total_count", label: "instance"},
		{tbl: "node_network_out_errors_total_count", label: "instance"},
	}
	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	table := &TableDef{
		Category:  []string{"Overview"},
		Title:     "Error",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"METRIC_NAME", "LABEL", "TOTAL_COUNT"},
	}

	resultRows := make([]TableRowDef, 0, len(defs))

	specialHandle := func(row []string) []string {
		row[2] = convertFloatToInt(row[2])
		return row
	}

	appendRows := func(row TableRowDef) {
		row.Values = specialHandle(row.Values)
		for i := range row.SubValues {
			row.SubValues[i] = specialHandle(row.SubValues[i])
		}
		resultRows = append(resultRows, row)
	}

	arg := &queryArg{
		startTime: startTime,
		endTime:   endTime,
	}

	err := getTableRows(defs, arg, db, appendRows)
	if err != nil {
		return nil, err
	}
	table.Rows = resultRows
	return table, nil
}

func GetTiDBTxnTableData(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	defs1 := []totalValueAndTotalCountTableDef{
		{name: "tidb_transaction_retry_num", tbl: "tidb_transaction_retry_num", sumTbl: "tidb_transaction_retry_total_num", countTbl: "tidb_transaction_retry_num_total_count", label: "instance"},
		{name: "tidb_transaction_statement_num", tbl: "tidb_transaction_statement_num", sumTbl: "tidb_transaction_statement_total_num", countTbl: "tidb_transaction_statement_num_total_count", label: "sql_type"},
		{name: "tidb_txn_region_num", tbl: "tidb_txn_region_num", sumTbl: "tidb_txn_region_total_num", countTbl: "tidb_txn_region_num_total_count", label: "instance"},
		{name: "tidb_kv_write_num", tbl: "tidb_kv_write_num", sumTbl: "tidb_kv_write_total_num", countTbl: "tidb_kv_write_num_total_count", label: "instance"},
		{name: "tidb_kv_write_size", tbl: "tidb_kv_write_size", sumTbl: "tidb_kv_write_total_size", countTbl: "tidb_kv_write_size_total_count", label: "instance"},
	}
	defs2 := []sumValueQuery{
		{name: "tidb_load_safepoint_total_num", tbl: "tidb_load_safepoint_total_num", label: "type"},
		{name: "tidb_lock_resolver_total_num", tbl: "tidb_lock_resolver_total_num", label: "type"},
	}

	defs := make([]rowQuery, 0, len(defs1)+len(defs2))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}
	for i := range defs2 {
		defs = append(defs, defs2[i])
	}

	resultRows := make([]TableRowDef, 0, len(defs))

	quantiles := []float64{0.999, 0.99, 0.90, 0.80}
	table := &TableDef{
		Category:  []string{"TiDB"},
		Title:     "Transaction",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"METRIC_NAME", "LABEL", "TOTAL_VALUE", "TOTAL_COUNT", "P999", "P99", "P90", "P80"},
	}

	specialHandle := func(row []string) []string {
		for len(row) < 8 {
			row = append(row, "")
		}

		for i := 2; i < len(row); i++ {
			if len(row[i]) == 0 {
				continue
			}
			row[i] = convertFloatToInt(row[i])
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

	arg := &queryArg{
		startTime: startTime,
		endTime:   endTime,
		quantiles: quantiles,
	}

	err := getTableRows(defs, arg, db, appendRows)
	if err != nil {
		return nil, err
	}
	table.Rows = resultRows
	return table, nil
}

func GetTiDBDDLOwner(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	sql := fmt.Sprintf("select min(time),instance from metrics_schema.tidb_ddl_worker_total_count where time>='%s' and time<'%s' and value>0 and type='run_job' group by instance order by min(time);",
		startTime, endTime)

	rows, err := getSQLRows(db, sql)
	if err != nil {
		return nil, err
	}
	table := &TableDef{
		Category:  []string{"TiDB"},
		Title:     "DDL-owner",
		CommentEN: "DDL Owner info. Attention, if no DDL request has been executed, below owner info maybe null, it doesn't indicate no DDL owner exists.",
		CommentCN: "",
		Column:    []string{"MIN_TIME", "DDL OWNER"},
		Rows:      rows,
	}
	return table, nil
}

func getSQLRows(db *sql.DB, sql string) ([]TableRowDef, error) {
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	resultRows := make([]TableRowDef, len(rows))
	for i := range rows {
		resultRows[i] = TableRowDef{Values: rows[i]}
	}
	return resultRows, nil
}

func getTableRows(defs []rowQuery, arg *queryArg, db *sql.DB, appendRows func(def TableRowDef)) error {
	for _, def := range defs {
		row, err := def.queryRow(arg, db)
		if err != nil {
			fmt.Println(err)
			continue
		}
		if row == nil {
			continue
		}
		appendRows(*row)
	}
	return nil
}
