package diagnose_report

import (
	"database/sql"
	"fmt"
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
	CategoryConfig   = "Config"
)

func GetReportTables(startTime, endTime string, db *sql.DB) ([]*TableDef, []error) {
	funcs := []func(string, string, *sql.DB) (*TableDef, error){
		// Header
		GetHeaderTimeTable,
		//GetClusterHardwareInfoTable
		GetClusterInfoTable,

		// Node
		GetAvgMaxMinTable,
		GetCPUUsageTable,
		GetTiKVThreadCPUTable,
		GetGoroutinesCountTable,

		// Overview
		GetTotalTimeConsumeTable,
		GetTotalErrorTable,

		// TiDB
		GetTiDBTxnTableData,
		GetTiDBDDLOwner,
		GetTiDBDDLInfoTable,

		// PD
		GetPDTimeConsumeTable,
		GetPDSchedulerInfo,
		GetPDClusterStatusTable,
		GetStoreStatusTable,
		GetPDEtcdStatusTable,

		// TiKV
		GetTiKVTotalTimeConsumeTable,
		GetTiKVKVInfo,
		GetTiKVErrorTable,
		GetTiKVCacheHitTable,

		// Config
		GetPDConfigInfo,
		GetTiDBGCConfigInfo,
		GetTiDBCurrentConfig,
		GetPDCurrentConfig,
		GetTiKVCurrentConfig,
	}
	tables := make([]*TableDef, 0, len(funcs))
	errs := make([]error, 0, len(funcs))
	for _, f := range funcs {
		tbl, err := f(startTime, endTime, db)
		if err != nil {
			errs = append(errs, err)
		}
		if tbl != nil {
			tables = append(tables, tbl)
		}
	}
	return tables, errs
}

func GetHeaderTimeTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	return &TableDef{
		Category:  []string{CategoryHeader},
		Title:     "Report Time Range",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"START_TIME", "END_TIME"},
		Rows: []TableRowDef{
			{Values: []string{startTime, endTime}},
		},
	}, nil
}

func GetTotalTimeConsumeTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	defs1 := []totalTimeByLabelsTableDef{
		{name: "tidb_query", tbl: "tidb_query", labels: []string{"sql_type"}},
		{name: "tidb_get_token(us)", tbl: "tidb_get_token", labels: []string{"instance"}},
		{name: "tidb_parse", tbl: "tidb_parse", labels: []string{"sql_type"}},
		{name: "tidb_compile", tbl: "tidb_compile", labels: []string{"sql_type"}},
		{name: "tidb_execute", tbl: "tidb_execute", labels: []string{"sql_type"}},
		{name: "tidb_distsql_execution", tbl: "tidb_distsql_execution", labels: []string{"type"}},
		{name: "tidb_cop", tbl: "tidb_cop", labels: []string{"instance"}},
		{name: "tidb_transaction_local_latch_wait", tbl: "tidb_transaction_local_latch_wait", labels: []string{"instance"}},
		{name: "tidb_transaction", tbl: "tidb_transaction", labels: []string{"sql_type"}},
		{name: "tidb_kv_backoff", tbl: "tidb_kv_backoff", labels: []string{"type"}},
		{name: "tidb_kv_request", tbl: "tidb_kv_request", labels: []string{"type"}},
		{name: "tidb_slow_query", tbl: "tidb_slow_query"},
		{name: "tidb_slow_query_cop_process", tbl: "tidb_slow_query_cop_process"},
		{name: "tidb_slow_query_cop_wait", tbl: "tidb_slow_query_cop_wait"},
		{name: "tidb_ddl_handle_job", tbl: "tidb_ddl", labels: []string{"type"}},
		{name: "tidb_ddl_worker", tbl: "tidb_ddl_worker", labels: []string{"action"}},
		{name: "tidb_ddl_update_self_version", tbl: "tidb_ddl_update_self_version", labels: []string{"result"}},
		{name: "tidb_owner_handle_syncer", tbl: "tidb_owner_handle_syncer", labels: []string{"type"}},
		{name: "tidb_ddl_batch_add_index", tbl: "tidb_ddl_batch_add_index", labels: []string{"type"}},
		{name: "tidb_ddl_deploy_syncer", tbl: "tidb_ddl_deploy_syncer", labels: []string{"type"}},
		//{name: "tidb_new_etcd_session", tbl: "tidb_new_etcd_session", labels: []string{"type"}},
		{name: "tidb_load_schema", tbl: "tidb_load_schema", labels: []string{"instance"}},
		{name: "tidb_meta_operation", tbl: "tidb_meta_operation", labels: []string{"type"}},
		{name: "tidb_auto_id_request", tbl: "tidb_auto_id_request", labels: []string{"type"}},
		{name: "tidb_statistics_auto_analyze", tbl: "tidb_statistics_auto_analyze", labels: []string{"instance"}},
		{name: "tidb_gc_push_task", tbl: "tidb_gc_push_task", labels: []string{"type"}},
		{name: "tidb_gc", tbl: "tidb_gc", labels: []string{"instance"}},
		{name: "tidb_batch_client_unavailable", tbl: "tidb_batch_client_unavailable", labels: []string{"instance"}},
		{name: "tidb_batch_client_wait", tbl: "tidb_batch_client_wait", labels: []string{"instance"}},
		// PD
		{name: "pd_start_tso_wait", tbl: "pd_start_tso_wait", labels: []string{"instance"}},
		{name: "pd_tso_rpc", tbl: "pd_tso_rpc", labels: []string{"instance"}},
		{name: "pd_tso_wait", tbl: "pd_tso_wait", labels: []string{"instance"}},
		{name: "pd_client_cmd", tbl: "pd_client_cmd", labels: []string{"type"}},
		{name: "pd_handle_request", tbl: "pd_handle_request", labels: []string{"type"}},
		{name: "pd_grpc_completed_commands", tbl: "pd_grpc_completed_commands", labels: []string{"grpc_method"}},
		{name: "pd_operator_finish", tbl: "pd_operator_finish", labels: []string{"type"}},
		{name: "pd_operator_step_finish", tbl: "pd_operator_step_finish", labels: []string{"type"}},
		{name: "pd_handle_transactions", tbl: "pd_handle_transactions", labels: []string{"result"}},
		{name: "pd_peer_round_trip", tbl: "pd_peer_round_trip", labels: []string{"To"}},
		{name: "pd_region_heartbeat", tbl: "pd_region_heartbeat", labels: []string{"address"}},
		{name: "etcd_wal_fsync", tbl: "etcd_wal_fsync", labels: []string{"instance"}},

		// TiKV
		{name: "tikv_grpc_messge", tbl: "tikv_grpc_messge", labels: []string{"type"}},
		{name: "tikv_cop_request", tbl: "tikv_cop_request", labels: []string{"req"}},
		{name: "tikv_cop_handle", tbl: "tikv_cop_handle", labels: []string{"req"}},
		{name: "tikv_cop_wait", tbl: "tikv_cop_wait", labels: []string{"req"}},
		{name: "tikv_process", tbl: "tikv_process", labels: []string{"type"}},
		{name: "tikv_propose_wait", tbl: "tikv_propose_wait", labels: []string{"instance"}},
		{name: "tikv_scheduler_command", tbl: "tikv_scheduler_command", labels: []string{"type"}},
		{name: "tikv_scheduler_latch_wait", tbl: "tikv_scheduler_latch_wait", labels: []string{"type"}},
		{name: "tikv_lock_manager_deadlock_detect", tbl: "tikv_lock_manager_deadlock_detect", labels: []string{"instance"}},
		{name: "tikv_lock_manager_waiter_lifetime", tbl: "tikv_lock_manager_waiter_lifetime", labels: []string{"instance"}},
		{name: "tikv_handle_snapshot", tbl: "tikv_handle_snapshot", labels: []string{"type"}},
		{name: "tikv_send_snapshot", tbl: "tikv_send_snapshot", labels: []string{"instance"}},
		{name: "tikv_storage_async_request", tbl: "tikv_storage_async_request", labels: []string{"type"}},
		{name: "tikv_append_log", tbl: "tikv_append_log", labels: []string{"instance"}},
		{name: "tikv_apply_log", tbl: "tikv_apply_log", labels: []string{"instance"}},
		{name: "tikv_apply_wait", tbl: "tikv_apply_wait", labels: []string{"instance"}},
		{name: "tikv_check_split", tbl: "tikv_check_split", labels: []string{"instance"}},
		{name: "tikv_commit_log", tbl: "tikv_commit_log", labels: []string{"instance"}},
		{name: "tikv_raft_store_events", tbl: "tikv_raft_store_events", labels: []string{"type"}},
		{name: "tikv_ingest_sst", tbl: "tikv_ingest_sst", labels: []string{"instance"}},
		{name: "tikv_gc_tasks", tbl: "tikv_gc_tasks", labels: []string{"task"}},
		{name: "tikv_backup_range", tbl: "tikv_backup_range", labels: []string{"type"}},
		{name: "tikv_backup", tbl: "tikv_backup", labels: []string{"instance"}},
	}

	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	table := &TableDef{
		Category:  []string{CategoryOverview},
		Title:     "Time Consume",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"METRIC_NAME", "LABEL", "TIME_RATIO", "TOTAL_TIME", "TOTAL_COUNT", "P999", "P99", "P90", "P80"},
	}

	resultRows := make([]TableRowDef, 0, len(defs))
	arg := newQueryArg(startTime, endTime)
	specialHandle := func(row []string) []string {
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

func GetTotalErrorTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	defs1 := []sumValueQuery{
		{tbl: "tidb_binlog_error_total_count", labels: []string{"instance"}},
		{tbl: "tidb_handshake_error_total_count", labels: []string{"instance"}},
		{tbl: "tidb_transaction_retry_error_total_count", labels: []string{"sql_type"}},
		{tbl: "tidb_kv_region_error_total_count", labels: []string{"type"}},
		{tbl: "tidb_schema_lease_error_total_count", labels: []string{"instance"}},
		{tbl: "tikv_grpc_error_total_count", labels: []string{"type"}},
		{tbl: "tikv_critical_error_total_count", labels: []string{"type"}},
		{tbl: "tikv_scheduler_is_busy_total_count", labels: []string{"type"}},
		{tbl: "tikv_channel_full_total_count", labels: []string{"type"}},
		//{tbl: "tikv_coprocessor_is_busy_total_count", labels: []string{"instance"}},
		{tbl: "tikv_coprocessor_request_error_total_count", labels: []string{"reason"}},
		{tbl: "tikv_engine_write_stall", labels: []string{"instance"}},
		{tbl: "tikv_server_report_failures_total_count", labels: []string{"instance"}},
		{name: "tikv_storage_async_request_error", tbl: "tikv_storage_async_requests_total_count", labels: []string{"type"}, condition: "status not in ('all','success')"},
		{tbl: "tikv_lock_manager_detect_error_total_count", labels: []string{"type"}},
		{tbl: "tikv_backup_errors_total_count", labels: []string{"error"}},
		{tbl: "node_network_in_errors_total_count", labels: []string{"instance"}},
		{tbl: "node_network_out_errors_total_count", labels: []string{"instance"}},
	}
	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	table := &TableDef{
		Category:  []string{CategoryOverview},
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
		{name: "tidb_transaction_retry_num", tbl: "tidb_transaction_retry_num", sumTbl: "tidb_transaction_retry_total_num", countTbl: "tidb_transaction_retry_num_total_count", labels: []string{"instance"}},
		{name: "tidb_transaction_statement_num", tbl: "tidb_transaction_statement_num", sumTbl: "tidb_transaction_statement_total_num", countTbl: "tidb_transaction_statement_num_total_count", labels: []string{"sql_type"}},
		{name: "tidb_txn_region_num", tbl: "tidb_txn_region_num", sumTbl: "tidb_txn_region_total_num", countTbl: "tidb_txn_region_num_total_count", labels: []string{"instance"}},
		{name: "tidb_kv_write_num", tbl: "tidb_kv_write_num", sumTbl: "tidb_kv_write_total_num", countTbl: "tidb_kv_write_num_total_count", labels: []string{"instance"}},
		{name: "tidb_kv_write_size", tbl: "tidb_kv_write_size", sumTbl: "tidb_kv_write_total_size", countTbl: "tidb_kv_write_size_total_count", labels: []string{"instance"}},
	}
	defs2 := []sumValueQuery{
		{name: "tidb_load_safepoint_total_num", tbl: "tidb_load_safepoint_total_num", labels: []string{"type"}},
		{name: "tidb_lock_resolver_total_num", tbl: "tidb_lock_resolver_total_num", labels: []string{"type"}},
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
		Category:  []string{CategoryTiDB},
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
		Category:  []string{CategoryTiDB},
		Title:     "DDL-owner",
		CommentEN: "DDL Owner info. Attention, if no DDL request has been executed, below owner info maybe null, it doesn't indicate no DDL owner exists.",
		CommentCN: "",
		Column:    []string{"MIN_TIME", "DDL OWNER"},
		Rows:      rows,
	}
	return table, nil
}

func GetTiDBDDLInfoTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	defs1 := []totalTimeByLabelsTableDef{
		{name: "tidb_ddl_handle_job", tbl: "tidb_ddl", labels: []string{"instance", "type"}},
		{name: "tidb_ddl_update_self_version", tbl: "tidb_ddl_update_self_version", labels: []string{"instance", "result"}},
		{name: "tidb_ddl_worker", tbl: "tidb_ddl_worker", labels: []string{"instance", "type", "result", "action"}},
		{name: "tidb_load_schema", tbl: "tidb_load_schema", labels: []string{"instance"}},
		{name: "tidb_ddl_batch_add_index", tbl: "tidb_ddl_batch_add_index", labels: []string{"instance", "type"}},
		{name: "tidb_ddl_deploy_syncer", tbl: "tidb_ddl_deploy_syncer", labels: []string{"instance", "type", "result"}},
		{name: "tidb_owner_handle_syncer", tbl: "tidb_owner_handle_syncer", labels: []string{"instance", "type", "result"}},
		{name: "tidb_new_etcd_session", tbl: "tidb_new_etcd_session", labels: []string{"instance", "type", "result"}},
	}

	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	table := &TableDef{
		Category:  []string{CategoryTiDB},
		Title:     "Time Consume",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"METRIC_NAME", "LABEL", "TIME_RATIO", "TOTAL_TIME", "TOTAL_COUNT", "P999", "P99", "P90", "P80"},
	}

	resultRows := make([]TableRowDef, 0, len(defs))
	arg := newQueryArg(startTime, endTime)
	specialHandle := func(row []string) []string {
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

func GetPDConfigInfo(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	sql := fmt.Sprintf(`select t1.*,t2.count from
		(select min(time),type,value from metrics_schema.pd_scheduler_config where time>='%[1]s' and time<'%[2]s' group by type,value order by type) as t1 join
		(select type, count(distinct value) as count from metrics_schema.pd_scheduler_config where time>='%[1]s' and time<'%[2]s' group by type order by count desc) as t2 
		where t1.type=t2.type order by t2.count desc;`, startTime, endTime)

	rows, err := getSQLRows(db, sql)
	if err != nil {
		return nil, err
	}
	table := &TableDef{
		Category:  []string{CategoryConfig},
		Title:     "Scheduler Config",
		CommentEN: "PD scheduler config change history",
		CommentCN: "",
		Column:    []string{"MIN_TIME", "CONFIG_ITEM", "VALUE", "CHANGE_COUNT"},
		Rows:      rows,
	}
	return table, nil
}

func GetTiDBGCConfigInfo(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	sql := fmt.Sprintf(`select t1.*,t2.count from
		(select min(time),type,value from metrics_schema.tidb_gc_config where time>='%[1]s' and time<'%[2]s' group by type,value order by type) as t1 join
		(select type, count(distinct value) as count from metrics_schema.tidb_gc_config where time>='%[1]s' and time<'%[2]s' group by type order by count desc) as t2 
		where t1.type=t2.type order by t2.count desc;`, startTime, endTime)

	rows, err := getSQLRows(db, sql)
	if err != nil {
		return nil, err
	}
	table := &TableDef{
		Category:  []string{CategoryConfig},
		Title:     "Scheduler Config",
		CommentEN: "PD scheduler config change history",
		CommentCN: "",
		Column:    []string{"MIN_TIME", "CONFIG_ITEM", "VALUE", "CHANGE_COUNT"},
		Rows:      rows,
	}
	return table, nil
}

func GetPDTimeConsumeTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	defs1 := []totalTimeByLabelsTableDef{
		{name: "pd_client_cmd", tbl: "pd_client_cmd", labels: []string{"type"}},
		{name: "pd_grpc_completed_commands", tbl: "pd_grpc_completed_commands", labels: []string{"grpc_method"}},
		{name: "pd_handle_request", tbl: "pd_handle_request", labels: []string{"type"}},
		{name: "pd_operator_finish", tbl: "pd_operator_finish", labels: []string{"type"}},
		{name: "pd_operator_step_finish", tbl: "pd_operator_step_finish", labels: []string{"type"}},
		{name: "pd_handle_transactions", tbl: "pd_handle_transactions", labels: []string{"result"}},
		{name: "pd_peer_round_trip", tbl: "pd_peer_round_trip", labels: []string{"To"}},
		{name: "pd_region_heartbeat", tbl: "pd_region_heartbeat", labels: []string{"address"}},
		{name: "etcd_wal_fsync", tbl: "etcd_wal_fsync", labels: []string{"instance"}},
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
	appendRows := func(row TableRowDef) {
		resultRows = append(resultRows, row)
		arg.totalTime = 0
	}

	err := getTableRows(defs, arg, db, appendRows)
	if err != nil {
		return nil, err
	}
	table.Rows = resultRows
	return table, nil
}

func GetPDSchedulerInfo(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	defs1 := []sumValueQuery{
		{name: "blance-leader-in", tbl: "pd_scheduler_balance_leader", condition: "type='move-leader' and address like '%-in'", labels: []string{"address"}},
		{name: "blance-leader-out", tbl: "pd_scheduler_balance_leader", condition: "type='move-leader' and address like '%-out'", labels: []string{"address"}},
		{name: "blance-region-in", tbl: "pd_scheduler_balance_region", condition: "type='move-peer' and address like '%-in'", labels: []string{"address"}},
		{name: "blance-region-out", tbl: "pd_scheduler_balance_region", condition: "type='move-peer' and address like '%-out'", labels: []string{"address"}},
	}
	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	table := &TableDef{
		Category:  []string{"PD"},
		Title:     "blance leader/region",
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

func GetTiKVTotalTimeConsumeTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	defs1 := []totalTimeByLabelsTableDef{
		// TiKV
		{name: "tikv_grpc_messge", tbl: "tikv_grpc_messge", labels: []string{"type"}},
		{name: "tikv_cop_request", tbl: "tikv_cop_request", labels: []string{"req"}},
		{name: "tikv_cop_handle", tbl: "tikv_cop_handle", labels: []string{"req"}},
		{name: "tikv_cop_wait", tbl: "tikv_cop_wait", labels: []string{"req"}},
		{name: "tikv_process", tbl: "tikv_process", labels: []string{"type"}},
		{name: "tikv_propose_wait", tbl: "tikv_propose_wait", labels: []string{"instance"}},
		{name: "tikv_scheduler_command", tbl: "tikv_scheduler_command", labels: []string{"type"}},
		{name: "tikv_scheduler_latch_wait", tbl: "tikv_scheduler_latch_wait", labels: []string{"type"}},
		{name: "tikv_lock_manager_deadlock_detect", tbl: "tikv_lock_manager_deadlock_detect", labels: []string{"instance"}},
		{name: "tikv_lock_manager_waiter_lifetime", tbl: "tikv_lock_manager_waiter_lifetime", labels: []string{"instance"}},
		{name: "tikv_handle_snapshot", tbl: "tikv_handle_snapshot", labels: []string{"type"}},
		{name: "tikv_send_snapshot", tbl: "tikv_send_snapshot", labels: []string{"instance"}},
		{name: "tikv_storage_async_request", tbl: "tikv_storage_async_request", labels: []string{"type"}},
		{name: "tikv_append_log", tbl: "tikv_append_log", labels: []string{"instance"}},
		{name: "tikv_apply_log", tbl: "tikv_apply_log", labels: []string{"instance"}},
		{name: "tikv_apply_wait", tbl: "tikv_apply_wait", labels: []string{"instance"}},
		{name: "tikv_check_split", tbl: "tikv_check_split", labels: []string{"instance"}},
		{name: "tikv_commit_log", tbl: "tikv_commit_log", labels: []string{"instance"}},
		{name: "tikv_raft_store_events", tbl: "tikv_raft_store_events", labels: []string{"type"}},
		{name: "tikv_ingest_sst", tbl: "tikv_ingest_sst", labels: []string{"instance"}},
		{name: "tikv_gc_tasks", tbl: "tikv_gc_tasks", labels: []string{"task"}},
		{name: "tikv_backup_range", tbl: "tikv_backup_range", labels: []string{"type"}},
		{name: "tikv_backup", tbl: "tikv_backup", labels: []string{"instance"}},
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

func GetTiKVKVInfo(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	defs1 := []totalValueAndTotalCountTableDef{
		{name: "tikv_raft_message_batch_size", tbl: "tikv_raft_message_batch_size", sumTbl: "tikv_raft_message_batch_total_size", countTbl: "tikv_raft_message_batch_size_total_count", labels: []string{"instance"}},
		{name: "tikv_request_batch_size", tbl: "tikv_request_batch_size", sumTbl: "tikv_request_batch_total_size", countTbl: "tikv_request_batch_size_total_count", labels: []string{"type"}},
		{name: "tikv_scheduler_keys_read", tbl: "tikv_scheduler_keys_read", sumTbl: "tikv_scheduler_keys_total_read", countTbl: "tikv_scheduler_keys_read_total_count", labels: []string{"type"}},
		{name: "tikv_scheduler_keys_written", tbl: "tikv_scheduler_keys_written", sumTbl: "tikv_scheduler_keys_total_written", countTbl: "tikv_scheduler_keys_written_total_count", labels: []string{"type"}},
		{name: "tikv_snapshot_kv_count", tbl: "tikv_snapshot_kv_count", sumTbl: "tikv_snapshot_kv_total_count", countTbl: "tikv_snapshot_kv_count_total_count", labels: []string{"instance"}},
		{name: "tikv_snapshot_size", tbl: "tikv_snapshot_size", sumTbl: "tikv_snapshot_total_size", countTbl: "tikv_snapshot_size_total_count", labels: []string{"instance"}},
	}
	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	resultRows := make([]TableRowDef, 0, len(defs))
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

	arg := newQueryArg(startTime, endTime)

	err := getTableRows(defs, arg, db, appendRows)
	if err != nil {
		return nil, err
	}
	table := &TableDef{
		Category:  []string{"TiKV"},
		Title:     "KV Info",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"METRIC_NAME", "LABEL", "TOTAL_VALUE", "TOTAL_COUNT", "P999", "P99", "P90", "P80"},
		Rows:      resultRows,
	}
	return table, nil
}

func GetTiKVErrorTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	defs1 := []sumValueQuery{
		{tbl: "tikv_grpc_error_total_count", labels: []string{"instance", "type"}},
		{tbl: "tikv_critical_error_total_count", labels: []string{"instance", "type"}},
		{tbl: "tikv_scheduler_is_busy_total_count", labels: []string{"instance", "db", "type", "stage"}},
		{tbl: "tikv_channel_full_total_count", labels: []string{"instance", "db", "type"}},
		//{tbl: "tikv_coprocessor_is_busy_total_count", labels: []string{"instance"}},
		{tbl: "tikv_coprocessor_request_error_total_count", labels: []string{"instance", "reason"}},
		{tbl: "tikv_engine_write_stall", labels: []string{"instance", "db"}},
		{tbl: "tikv_server_report_failures_total_count", labels: []string{"instance"}},
		{name: "tikv_storage_async_request_error", tbl: "tikv_storage_async_requests_total_count", labels: []string{"instance", "status", "type"}, condition: "status not in ('all','success')"},
		{tbl: "tikv_lock_manager_detect_error_total_count", labels: []string{"instance", "type"}},
		{tbl: "tikv_backup_errors_total_count", labels: []string{"instance", "error"}},
	}
	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	table := &TableDef{
		Category:  []string{"TiKV"},
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

func GetTiDBCurrentConfig(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	sql := fmt.Sprintf("select `key`,`value` from information_schema.CLUSTER_CONFIG where type='tidb' group by `key`,`value` order by `key`;")
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return nil, err
	}
	table := &TableDef{
		Category:  []string{CategoryConfig},
		Title:     "TiDB Current Config",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"KEY", "VALUE"},
		Rows:      rows,
	}
	return table, nil
}

func GetPDCurrentConfig(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	sql := fmt.Sprintf("select `key`,`value` from information_schema.CLUSTER_CONFIG where type='pd' group by `key`,`value` order by `key`;")
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return nil, err
	}
	table := &TableDef{
		Category:  []string{CategoryConfig},
		Title:     "PD Current Config",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"KEY", "VALUE"},
		Rows:      rows,
	}
	return table, nil
}

func GetTiKVCurrentConfig(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	sql := fmt.Sprintf("select `key`,`value` from information_schema.CLUSTER_CONFIG where type='tikv' group by `key`,`value` order by `key`;")
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return nil, err
	}
	table := &TableDef{
		Category:  []string{CategoryConfig},
		Title:     "TiKV Current Config",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"KEY", "VALUE"},
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

func NewTableRowDef(values []string, subValues [][]string) TableRowDef {
	return TableRowDef{
		Values:    values,
		SubValues: subValues,
	}
}

type AvgMaxMinTableDef struct {
	name  string
	tbl   string
	label string
}

func GetAvgMaxMinTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	tables := []AvgMaxMinTableDef{
		{name: "node_cpu_usage", tbl: "node_cpu_usage", label: "instance"},
		//{name: "node_mem_usage", tbl: "node_mem_usage", label: "instance"},
		{name: "node_disk_write_latency", tbl: "node_disk_write_latency", label: "instance"},
		{name: "node_disk_read_latency", tbl: "node_disk_read_latency", label: "instance"},
	}
	resultRows := make([]TableRowDef, 0, len(tables))
	table := &TableDef{
		Category:  []string{"node"},
		Title:     "hardware usage",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"METRIC_NAME", "instance", "AVG", "MAX", "MIN"},
	}
	for _, t := range tables {
		sql := fmt.Sprintf("select '%[4]s', '', avg(value), max(value), min(value) from metrics_schema.%[1]s where time >= '%[2]s' and time < '%[3]s'",
			t.tbl, startTime, endTime, t.name)
		rows, err := querySQL(db, sql)
		if err != nil {
			return nil, err
		}
		if len(rows) == 0 {
			continue
		}
		sql = fmt.Sprintf("select '', %[1]s, avg(value), max(value), min(value) from metrics_schema.%[2]s where time >= '%[3]s' and time < '%[4]s' group by %[1]s",
			t.label, t.tbl, startTime, endTime)
		subRows, err := querySQL(db, sql)
		if err != nil {
			return nil, err
		}
		resultRows = append(resultRows, NewTableRowDef(rows[0], subRows))
	}
	table.Rows = resultRows
	return table, nil
}

type CPUUsageTableDef struct {
	tbl   string
	label []string
}

func GetCPUUsageTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	tables := []CPUUsageTableDef{
		{tbl: "process_cpu_usage", label: []string{"instance", "job"}},
	}
	resultRows := make([]TableRowDef, 0, len(tables))
	table := &TableDef{
		Category:  []string{"node"},
		Title:     "process cpu usage",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"instance", "job", "AVG", "MAX", "MIN"},
	}
	for _, t := range tables {
		sql := fmt.Sprintf("select %[1]s, %[2]s, avg(value),max(value),min(value) from metrics_schema.%[3]s where time >= '%[4]s' and time < '%[5]s' group by %[1]s, %[2]s order by avg(value) desc",
			t.label[0], t.label[1], t.tbl, startTime, endTime)
		rows, err := querySQL(db, sql)
		if err != nil {
			return nil, err
		}
		if len(rows) == 0 {
			continue
		}
		for _, row := range rows {
			resultRows = append(resultRows, NewTableRowDef(row, nil))
		}
	}
	table.Rows = resultRows
	return table, nil
}

func GetGoroutinesCountTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	tables := []CPUUsageTableDef{
		{tbl: "goroutines_count", label: []string{"instance", "job"}},
	}

	resultRows := make([]TableRowDef, 0, len(tables))
	table := &TableDef{
		Category:  []string{"node"},
		Title:     "goroutines count",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"instance", "job", "AVG", "MAX", "MIN"},
	}
	for _, t := range tables {
		sql := fmt.Sprintf("select %[1]s, %[2]s, avg(value), max(value), min(value) from metrics_schema.%[3]s where %[2]s in ('tidb','pd') and time >= '%[4]s' and time < '%[5]s' group by %[1]s, %[2]s order by avg(value) desc",
			t.label[0], t.label[1], t.tbl, startTime, endTime)
		rows, err := querySQL(db, sql)
		if err != nil {
			return nil, err
		}
		if len(rows) == 0 {
			continue
		}
		for _, row := range rows {
			resultRows = append(resultRows, NewTableRowDef(row, nil))
		}
	}
	table.Rows = resultRows
	return table, nil
}

func GetTiKVThreadCPUTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	tables := []AvgMaxMinTableDef{
		{name: "raftstore", tbl: "tikv_thread_cpu", label: "instance"},
		{name: "apply", tbl: "tikv_thread_cpu", label: "instance"},
		{name: "sched_worker", tbl: "tikv_thread_cpu", label: "instance"},
	}

	resultRows := make([]TableRowDef, 0, len(tables))
	table := &TableDef{
		Category:  []string{"node"},
		Title:     "thread cpu",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"METRIC_NAME", "instance", "AVG", "MAX", "MIN"},
	}
	for _, t := range tables {
		sql := fmt.Sprintf("select '%[5]s', '', avg(value), max(value), min(value) from metrics_schema.%[2]s where time >= '%[3]s' and time < '%[4]s' and name like '%[5]s",
			t.label, t.tbl, startTime, endTime, t.name) + "%'"
		rows, err := querySQL(db, sql)
		if err != nil {
			return nil, err
		}
		if len(rows) == 0 {
			continue
		}
		sql = fmt.Sprintf("select '', %[1]s, avg(value), max(value) ,min(value) from metrics_schema.%[2]s where time >= '%[3]s' and time < '%[4]s' and name like '%[5]s",
			t.label, t.tbl, startTime, endTime, t.name)
		sql = sql + "%' group by " + t.label + " order by avg(value) desc"
		subRows, err := querySQL(db, sql)
		if err != nil {
			return nil, err
		}
		resultRows = append(resultRows, NewTableRowDef(rows[0], subRows))
	}
	table.Rows = resultRows
	return table, nil
}

func GetStoreStatusTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	tables := []AvgMaxMinTableDef{
		{name: "region_score", tbl: "pd_scheduler_store_status", label: "address"},
		{name: "leader_score", tbl: "pd_scheduler_store_status", label: "address"},
		{name: "region_count", tbl: "pd_scheduler_store_status", label: "address"},
		{name: "leader_count", tbl: "pd_scheduler_store_status", label: "address"},
		{name: "region_size", tbl: "pd_scheduler_store_status", label: "address"},
		{name: "leader_size", tbl: "pd_scheduler_store_status", label: "address"},
	}

	resultRows := make([]TableRowDef, 0, len(tables))
	table := &TableDef{
		Category:  []string{"PD"},
		Title:     "storage status",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"METRIC_NAME", "address", "AVG", "MAX", "MIN"},
	}
	for _, t := range tables {
		sql := fmt.Sprintf("select '%[4]s', '', avg(value), max(value), min(value) from metrics_schema.%[1]s where time >= '%[2]s' and time < '%[3]s' and type = '%[4]s'",
			t.tbl, startTime, endTime, t.name)
		rows, err := querySQL(db, sql)
		if err != nil {
			return nil, err
		}
		if len(rows) == 0 {
			continue
		}
		sql = fmt.Sprintf("select '', %[1]s, avg(value), max(value), min(value) from metrics_schema.%[2]s where time >= '%[3]s' and time < '%[4]s' and type = '%[5]s' group by %[1]s",
			t.label, t.tbl, startTime, endTime, t.name)
		subRows, err := querySQL(db, sql)
		if err != nil {
			return nil, err
		}
		resultRows = append(resultRows, NewTableRowDef(rows[0], subRows))
	}
	table.Rows = resultRows
	return table, nil
}

func GetPDClusterStatusTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	tables := []CPUUsageTableDef{
		{tbl: "pd_cluster_status", label: []string{"type"}},
	}

	resultRows := make([]TableRowDef, 0, len(tables))
	table := &TableDef{
		Category:  []string{"PD"},
		Title:     "cluster status",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"TYPE", "MAX", "MIN"},
	}
	for _, t := range tables {
		sql := fmt.Sprintf("select %[1]s, max(value), min(value) from metrics_schema.%[2]s group by %[1]s",
			t.label[0], t.tbl, startTime, endTime)
		rows, err := querySQL(db, sql)
		if err != nil {
			return nil, err
		}
		if len(rows) == 0 {
			continue
		}
		for _, row := range rows {
			resultRows = append(resultRows, NewTableRowDef(row, nil))
		}
	}
	table.Rows = resultRows
	return table, nil
}

func GetPDEtcdStatusTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	tables := []CPUUsageTableDef{
		{tbl: "pd_server_etcd_state", label: []string{"type"}},
	}

	resultRows := make([]TableRowDef, 0, len(tables))
	table := &TableDef{
		Category:  []string{"PD"},
		Title:     "etcd status",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"TYPE", "MAX", "MIN"},
	}
	for _, t := range tables {
		sql := fmt.Sprintf("select %[1]s, max(value), min(value) from metrics_schema.%[2]s group by %[1]s",
			t.label[0], t.tbl, startTime, endTime)
		rows, err := querySQL(db, sql)
		if err != nil {
			return nil, err
		}
		if len(rows) == 0 {
			continue
		}
		for _, row := range rows {
			resultRows = append(resultRows, NewTableRowDef(row, nil))
		}
	}
	table.Rows = resultRows
	return table, nil
}

func GetTiKVCacheHitTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	tables := []AvgMaxMinTableDef{
		{name: "tikv_memtable_hit", tbl: "tikv_memtable_hit", label: "type"},
		{name: "tikv_block_all_cache_hit", tbl: "tikv_block_all_cache_hit", label: "type"},
		{name: "index", tbl: "tikv_block_index_cache_hit", label: "type"},
		{name: "filter", tbl: "tikv_block_filter_cache_hit", label: "type"},
		{name: "data", tbl: "tikv_block_data_cache_hit", label: "type"},
	}

	resultRows := make([]TableRowDef, 0, len(tables))
	table := &TableDef{
		Category:  []string{"TiKV"},
		Title:     "cache hit",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"METRIC_NAME", "TPYE", "AVG", "MAX", "MIN"},
	}
	for i, t := range tables {
		sql := ""
		if i < 2 {
			sql = fmt.Sprintf("select '%[4]s', '', avg(value), max(value), min(value) from metrics_schema.%[1]s where time >= '%[2]s' and time < '%[3]s'",
				t.tbl, startTime, endTime, t.name)
		} else {
			sql = fmt.Sprintf("select '', '%[4]s', avg(value), max(value), min(value) from metrics_schema.%[1]s where time >= '%[2]s' and time < '%[3]s'",
				t.tbl, startTime, endTime, t.name)
		}
		rows, err := querySQL(db, sql)
		if err != nil {
			return nil, err
		}
		if len(rows) == 0 {
			continue
		}
		for _, row := range rows {
			resultRows = append(resultRows, NewTableRowDef(row, nil))
		}
	}
	table.Rows = resultRows
	return table, nil
}

func GetClusterInfoTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	tables := []CPUUsageTableDef{
		{tbl: "cluster_info", label: []string{}},
	}

	resultRows := make([]TableRowDef, 0, len(tables))
	table := &TableDef{
		Category:  []string{"header"},
		Title:     "cluster info",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"TYPE", "INSTANCE", "STATUS_ADDRESS", "VERSION", "GIT_HASH", "START_TIME", "UPTIME"},
	}
	for _, t := range tables {
		sql := fmt.Sprintf("select * from information_schema.%[1]s",
			t.tbl, startTime, endTime)
		rows, err := querySQL(db, sql)
		if err != nil {
			return nil, err
		}
		if len(rows) == 0 {
			continue
		}
		for _, row := range rows {
			resultRows = append(resultRows, NewTableRowDef(row, nil))
		}
	}
	table.Rows = resultRows
	return table, nil
}

type hardWare struct {
	instance string
	Type     map[string]int
	cpu      int
	memory   float64
	disk     map[string]float64
	uptime   string
}

func GetClusterHardwareInfoTable(startTime, endTime string, db *sql.DB) (*TableDef, error) {
	tables := []CPUUsageTableDef{
		{tbl: "cluster_info", label: []string{}},
	}

	resultRows := make([]TableRowDef, 0, len(tables))
	table := &TableDef{
		Category:  []string{"Header"},
		Title:     "cluster hardware",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"HOST", "INSTANCE", "CPU_CORES", "MEMORY (GB)", "DISK (GB)", "UPTIME"},
	}
	sql := "SELECT instance,type,VALUE FROM information_schema.CLUSTER_HARDWARE WHERE device_type='cpu' and name = 'cpu-physical-cores'"
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	m := make(map[string] *hardWare)
	var s string
	for _,row := range rows {
		idx := strings.Index(row[0],":")
		s := row[0]
		s = s[:idx]
		cpuCnt,err := strconv.Atoi(row[2])
		if err != nil {
			return &TableDef{},err
		}
		if _,ok := m[s]; ok {
			if _,ok := m[s].Type[row[1]]; ok {
				m[s].Type[row[1]] += 1
			} else {
				m[s].Type[row[1]] = 1
			}
			//m[s].Type += "," + row[1]
			m[s].cpu += cpuCnt
		} else {
			m[s] = &hardWare{s,map[string]int{row[1]:1},cpuCnt,0,make(map[string]float64),""}
		}
	}
	sql = "SELECT instance,VALUE FROM information_schema.CLUSTER_HARDWARE WHERE device_type='memory' and name = 'capacity'"
	rows, err = querySQL(db, sql)
	for _,row := range rows {
		s = row[0][:strings.Index(row[0],":")]
		memCnt,err := strconv.ParseFloat(row[1],64)
		if err != nil {
			return &TableDef{},err
		}
		if _,ok := m[s]; ok {
			m[s].memory += memCnt
		} else {
			m[s].memory = memCnt
		}
	}
	sql = "SELECT `INSTANCE`,`DEVICE_NAME`,`VALUE` from information_schema.CLUSTER_HARDWARE where `NAME` = 'total' AND (`DEVICE_NAME` LIKE '/dev%' or `DEVICE_NAME` LIKE 'sda%' or`DEVICE_NAME` LIKE 'nvme%')"
	rows, err = querySQL(db, sql)
	for _,row := range rows {
		s = row[0][:strings.Index(row[0],":")]
		diskCnt,err := strconv.ParseFloat(row[2],64)
		if err != nil {
			return &TableDef{},err
		}
		if _,ok := m[s]; ok {
			if _,ok := m[s].disk[row[1]]; ok {
				m[s].disk[row[1]] += diskCnt
			} else {
				m[s].disk[row[1]] = diskCnt
			}
		} else {
			m[s].disk = make(map[string] float64)
		}
	}
	sql = fmt.Sprintf("SELECT instance,max(value) FROM metrics_schema.node_uptime  where time >= '%[1]s' and time < '%[2]s' GROUP BY instance", startTime, endTime)
	rows, err = querySQL(db, sql)
	for _,row := range rows {
		s = row[0][:strings.Index(row[0],":")]
		if err != nil {
			return &TableDef{},err
		}
		m[s].uptime = row[1]
	}
	rows = rows[:0]
	for _,v := range m {
		row := make([]string,6)
		row[0] = v.instance
		//row[1] = v.Type
		for k,va := range v.Type {
			row[1] += fmt.Sprintf("%[1]s*%[2]s ",k,strconv.Itoa(va))
		}
		row[2] = strconv.Itoa(v.cpu) + "/" + strconv.Itoa(v.cpu * 2)
		row[3] = fmt.Sprintf("%f", v.memory/(1024*1024*1024))
		for k,va := range v.disk {
			row[4] += fmt.Sprintf("%[1]s : %[2]f\n",k,va/(1024*1024*1024))
		}
		row[5] = v.uptime
		rows = append(rows,row)
	}
	for _,row:= range rows {
		resultRows = append(resultRows, NewTableRowDef(row, nil))
	}
	table.Rows = resultRows
	return table, nil
}
