// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package diagnose

import (
	"bytes"
	"fmt"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"

	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
)

type TableDef struct {
	Category       []string `json:"category"` // The category of the table, such as [TiDB]
	Title          string   `json:"title"`
	Comment        string   `json:"comment"`
	joinColumns    []int
	compareColumns []int
	Column         []string      `json:"column"`
	Rows           []TableRowDef `json:"rows"`
}

type TableRowDef struct {
	Values    []string   `json:"values"`
	SubValues [][]string `json:"sub_values"` // SubValues need fold default.
	ratio     float64
	Comment   string `json:"comment"`
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
	CategoryLoad     = "load"
	CategoryOverview = "overview"
	CategoryTiDB     = "TiDB"
	CategoryPD       = "PD"
	CategoryTiKV     = "TiKV"
	CategoryConfig   = "config"
	CategoryError    = "error"
)

func GetReportTablesForDisplay(startTime, endTime string, db *gorm.DB, sqliteDB *dbstore.DB, reportID string) []*TableDef {
	errRows := checkBeforeReport(db)
	if len(errRows) > 0 {
		return []*TableDef{GenerateReportError(errRows)}
	}
	tables := GetReportTables(startTime, endTime, db, sqliteDB, reportID)

	lastCategory := ""
	for _, tbl := range tables {
		if tbl == nil {
			continue
		}
		category := strings.Join(tbl.Category, ",")
		if category != lastCategory {
			lastCategory = category
		} else {
			tbl.Category = []string{""}
		}
	}
	return tables
}

func checkBeforeReport(db *gorm.DB) (errRows []TableRowDef) {
	command := "you can use this shell command to set the config: `curl -X POST -d '{\"metric-storage\":\"http://{PROMETHEUS_ADDRESS}\"}' http://{PD_ADDRESS}/pd/api/v1/config`, \n" +
		"PROMETHEUS_ADDRESS is the prometheus address, It's used for query metric data; PD_ADDRESS is the HTTP API address of PD server, all PD servers need to set this config. \n" +
		"Here is an example: `curl -X POST -d '{\"metric-storage\":\"http://127.0.0.1:9090\"}' http://127.0.0.1:2379/pd/api/v1/config`"
	// Check for query metric.
	sql := "select count(*) from metrics_schema.up;"
	_, err := querySQL(db, sql)
	if err != nil {
		errRows = append(errRows, TableRowDef{
			Values: []string{
				"check before report",
				"metrics_schema.up",
				err.Error() + ", \n" +
					"Currently, the PD config `pd-server.metric-storage` value should be prometheus address, please check whether the config value is correct, you can use below sql check the value: \n" +
					"select * from information_schema.cluster_config where type='pd' and `key` ='pd-server.metric-storage'; , \n" + command,
			},
		})
		return
	}
	return nil
}

type getTableFunc = func(string, string, *gorm.DB) (TableDef, error)

func GetReportTables(startTime, endTime string, db *gorm.DB, sqliteDB *dbstore.DB, reportID string) []*TableDef {
	funcs := []getTableFunc{
		// Header
		GetHeaderTimeTable,
		GetClusterHardwareInfoTable,
		GetClusterInfoTable,

		// Diagnose
		GetAllDiagnoseReport,

		// Load
		GetLoadTable,
		GetCPUUsageTable,
		GetProcessMemUsageTable,
		GetTiKVThreadCPUTable,
		GetGoroutinesCountTable,

		// Overview
		GetTotalTimeConsumeTable,
		GetTotalErrorTable,

		// TiDB
		GetTiDBTimeConsumeTable,
		GetTiDBConnectionCountTable,
		GetTiDBTxnTableData,
		GetTiDBStatisticsInfo,
		GetTiDBDDLOwner,
		GetTiDBTopNSlowQuery,
		GetTiDBTopNSlowQueryGroupByDigest,
		GetTiDBSlowQueryWithDiffPlan,

		// PD
		GetPDTimeConsumeTable,
		GetPDSchedulerInfo,
		GetPDClusterStatusTable,
		GetStoreStatusTable,
		GetPDEtcdStatusTable,

		// TiKV
		GetTiKVTotalTimeConsumeTable,
		GetTiKVRocksDBTimeConsumeTable,
		GetTiKVErrorTable,
		GetTiKVStoreInfo,
		GetTiKVRegionSizeInfo,
		GetTiKVCopInfo,
		GetTiKVSchedulerInfo,
		GetTiKVRaftInfo,
		GetTiKVSnapshotInfo,
		GetTiKVGCInfo,
		GetTiKVTaskInfo,
		GetTiKVCacheHitTable,

		// Config
		GetPDConfigInfo,
		GetPDConfigChangeInfo,
		GetTiDBGCConfigInfo,
		GetTiDBGCConfigChangeInfo,
		GetTiKVRocksDBConfigInfo,
		GetTiKVRocksDBConfigChangeInfo,
		GetTiKVRaftStoreConfigInfo,
		GetTiKVRaftStoreConfigChangeInfo,
		GetTiDBCurrentConfig,
		GetPDCurrentConfig,
		GetTiKVCurrentConfig,
	}

	var progress int32
	totalTableCount := int32(len(funcs))
	tables, errRows := getTablesParallel(startTime, endTime, db, funcs, sqliteDB, reportID, &progress, &totalTableCount)
	tables = append(tables, GenerateReportError(errRows))
	return tables
}

func getTablesParallel(startTime, endTime string, db *gorm.DB, funcs []getTableFunc, sqliteDB *dbstore.DB, reportID string, progress, totalTableCount *int32) ([]*TableDef, []TableRowDef) {
	// get the local CPU count for concurrence
	conc := runtime.NumCPU()
	if conc > 20 {
		conc = 20
	}
	if conc > len(funcs) {
		conc = len(funcs)
	}
	taskChan := func2task(funcs)
	resChan := make(chan *tblAndErr, len(funcs))
	var wg sync.WaitGroup

	// get table concurrently
	for i := 0; i < conc; i++ {
		wg.Add(1)
		go doGetTable(taskChan, resChan, &wg, startTime, endTime, db, sqliteDB, reportID, progress, totalTableCount)
	}
	wg.Wait()
	// all task done, close the resChan
	close(resChan)

	tblAndErrSlice := make([]tblAndErr, 0, cap(resChan))
	for tblAndErr := range resChan {
		tblAndErrSlice = append(tblAndErrSlice, *tblAndErr)
	}
	sort.Slice(tblAndErrSlice, func(i, j int) bool {
		return tblAndErrSlice[i].taskID < tblAndErrSlice[j].taskID
	})

	tables := make([]*TableDef, 0, len(tblAndErrSlice)+1)
	errRows := make([]TableRowDef, 0, len(tblAndErrSlice))
	for _, v := range tblAndErrSlice {
		if v.tbl != nil {
			tables = append(tables, v.tbl)
		}
		if v.err != nil {
			errRows = append(errRows, *v.err)
		}
	}
	return tables, errRows
}

type tblAndErr struct {
	tbl    *TableDef
	err    *TableRowDef
	taskID int
}

// 1.doGetTable gets the task from taskChan,and close the taskChan if taskChan is empty.
// 2.doGetTable puts the tblAndErr result to resChan.
// 3.if taskChan is empty, put a true in doneChan.
func doGetTable(taskChan chan *task, resChan chan *tblAndErr, wg *sync.WaitGroup, startTime, endTime string, db *gorm.DB, sqliteDB *dbstore.DB, reportID string, progress, totalTableCount *int32) {
	defer wg.Done()
	for task := range taskChan {
		f := task.t
		var tbl TableDef
		var err error
		func() {
			defer func() {
				if r := recover(); r != nil {
					tbl.Title = fmt.Sprintf("panic_in_table_%v", task.taskID)
					err = fmt.Errorf("panic: %v", r)
				}
			}()
			tbl, err = f(startTime, endTime, db)
		}()
		newProgress := atomic.AddInt32(progress, 1)
		tblAndErr := tblAndErr{}
		if err != nil {
			category := strings.Join(tbl.Category, ",")
			tblAndErr.err = &TableRowDef{Values: []string{category, tbl.Title, err.Error()}}
		}
		if tbl.Rows != nil {
			tblAndErr.tbl = &tbl
		}
		tblAndErr.taskID = task.taskID
		resChan <- &tblAndErr
		if sqliteDB != nil {
			_ = UpdateReportProgress(sqliteDB, reportID, int((newProgress*100)/atomic.LoadInt32(totalTableCount)))
		}
	}
}

type task struct {
	t      getTableFunc
	taskID int // taskID for arrange the tables in order
}

// change the get-Table-func to task.
func func2task(funcs []getTableFunc) chan *task {
	taskChan := make(chan *task, len(funcs))
	for i := 0; i < len(funcs); i++ {
		taskChan <- &task{funcs[i], i}
	}
	close(taskChan)
	return taskChan
}

func GenerateReportError(errRows []TableRowDef) *TableDef {
	return &TableDef{
		Category: []string{CategoryError},
		Title:    "generate_report_error",
		Comment:  "",
		Column:   []string{"CATEGORY", "TABLE", "ERROR"},
		Rows:     errRows,
	}
}

func GetHeaderTimeTable(startTime, endTime string, _ *gorm.DB) (TableDef, error) {
	return TableDef{
		Category: []string{CategoryHeader},
		Title:    "report_time_range",
		Comment:  "",
		Column:   []string{"START_TIME", "END_TIME"},
		Rows: []TableRowDef{
			{Values: []string{startTime, endTime}},
		},
	}, nil
}

func GetAllDiagnoseReport(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	return GetDiagnoseReport(startTime, endTime, db, nil)
}

func GetDiagnoseReport(startTime, endTime string, db *gorm.DB, rules []string) (TableDef, error) {
	table := TableDef{
		Category: []string{CategoryDiagnose},
		Title:    "diagnose",
		Comment:  "",
		Column:   []string{"RULE", "ITEM", "TYPE", "INSTANCE", "STATUS_ADDRESS", "VALUE", "REFERENCE", "SEVERITY", "DETAILS"},
	}
	sql := fmt.Sprintf("select /*+ time_range('%s','%s') */ %s from information_schema.INSPECTION_RESULT", startTime, endTime, strings.Join(table.Column, ","))
	if len(rules) > 0 {
		sql = fmt.Sprintf("%s where RULE in ('%s')", sql, strings.Join(rules, "','"))
	}
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	newRows := make([]TableRowDef, 0, len(rows))
	rowIdxMap := make(map[string]int)
	for _, row := range rows {
		if len(row.Values) < len(table.Column) {
			continue
		}
		// rule + item
		name := row.Values[0] + row.Values[1]
		idx, ok := rowIdxMap[name]
		if ok && idx < len(newRows) {
			newRows[idx].SubValues = append(newRows[idx].SubValues, row.Values)
			continue
		}
		newRows = append(newRows, row)
		rowIdxMap[name] = len(newRows) - 1
	}
	table.Rows = newRows
	return table, nil
}

func GetTotalTimeConsumeTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []totalTimeByLabelsTableDef{
		{name: "tidb_query", tbl: "tidb_query", labels: []string{"sql_type"}},
		{name: "tidb_get_token(us)", tbl: "tidb_get_token", labels: []string{"instance"}},
		{name: "tidb_parse", tbl: "tidb_parse", labels: []string{"sql_type"}},
		{name: "tidb_compile", tbl: "tidb_compile", labels: []string{"sql_type"}},
		{name: "tidb_execute", tbl: "tidb_execute", labels: []string{"sql_type"}},
		{name: "tidb_distsql_execution", tbl: "tidb_distsql_execution", labels: []string{"type"}},
		{name: "tidb_cop", tbl: "tidb_cop", labels: []string{"instance"}},
		{name: "tidb_transaction", tbl: "tidb_transaction", labels: []string{"sql_type"}},
		{name: "tidb_transaction_local_latch_wait", tbl: "tidb_transaction_local_latch_wait", labels: []string{"instance"}},
		{name: "tidb_txn_cmd", tbl: "tidb_txn_cmd", labels: []string{"type"}},
		{name: "tidb_kv_backoff", tbl: "tidb_kv_backoff", labels: []string{"type"}},
		{name: "tidb_kv_request", tbl: "tidb_kv_request", labels: []string{"type"}},
		{name: "tidb_slow_query", tbl: "tidb_slow_query", labels: []string{"instance"}},
		{name: "tidb_slow_query_cop_process", tbl: "tidb_slow_query_cop_process", labels: []string{"instance"}},
		{name: "tidb_slow_query_cop_wait", tbl: "tidb_slow_query_cop_wait", labels: []string{"instance"}},
		{name: "tidb_ddl_handle_job", tbl: "tidb_ddl", labels: []string{"type"}},
		{name: "tidb_ddl_worker", tbl: "tidb_ddl_worker", labels: []string{"action"}},
		{name: "tidb_ddl_update_self_version", tbl: "tidb_ddl_update_self_version", labels: []string{"result"}},
		{name: "tidb_owner_handle_syncer", tbl: "tidb_owner_handle_syncer", labels: []string{"type"}},
		{name: "tidb_ddl_batch_add_index", tbl: "tidb_ddl_batch_add_index", labels: []string{"type"}},
		{name: "tidb_ddl_deploy_syncer", tbl: "tidb_ddl_deploy_syncer", labels: []string{"type"}},
		{name: "tidb_load_schema", tbl: "tidb_load_schema", labels: []string{"instance"}},
		{name: "tidb_meta_operation", tbl: "tidb_meta_operation", labels: []string{"type"}},
		{name: "tidb_auto_id_request", tbl: "tidb_auto_id_request", labels: []string{"type"}},
		{name: "tidb_statistics_auto_analyze", tbl: "tidb_statistics_auto_analyze", labels: []string{"instance"}},
		{name: "tidb_gc", tbl: "tidb_gc", labels: []string{"instance"}},
		{name: "tidb_gc_push_task", tbl: "tidb_gc_push_task", labels: []string{"type"}},
		{name: "tidb_batch_client_unavailable", tbl: "tidb_batch_client_unavailable", labels: []string{"instance"}},
		{name: "tidb_batch_client_wait", tbl: "tidb_batch_client_wait", labels: []string{"instance"}},
		{name: "tidb_batch_client_wait_conn", tbl: "tidb_batch_client_wait_conn", labels: []string{"instance"}},
		// PD
		{name: "pd_tso_rpc", tbl: "pd_tso_rpc", labels: []string{"instance"}},
		{name: "pd_tso_wait", tbl: "pd_tso_wait", labels: []string{"instance"}},
		{name: "pd_client_cmd", tbl: "pd_client_cmd", labels: []string{"type"}},
		{name: "pd_client_request_rpc", tbl: "pd_request_rpc", labels: []string{"type"}},
		{name: "pd_grpc_completed_commands", tbl: "pd_grpc_completed_commands", labels: []string{"grpc_method"}},
		{name: "pd_operator_finish", tbl: "pd_operator_finish", labels: []string{"type"}},
		{name: "pd_operator_step_finish", tbl: "pd_operator_step_finish", labels: []string{"type"}},
		{name: "pd_handle_transactions", tbl: "pd_handle_transactions", labels: []string{"result"}},
		{name: "pd_region_heartbeat", tbl: "pd_region_heartbeat", labels: []string{"address"}},
		{name: "etcd_wal_fsync", tbl: "etcd_wal_fsync", labels: []string{"instance"}},
		{name: "pd_peer_round_trip", tbl: "pd_peer_round_trip", labels: []string{"To"}},
		// TiKV
		{name: "tikv_grpc_message", tbl: "tikv_grpc_message", labels: []string{"type"}},
		{name: "tikv_cop_request", tbl: "tikv_cop_request", labels: []string{"req"}},
		{name: "tikv_cop_handle", tbl: "tikv_cop_handle", labels: []string{"req"}},
		{name: "tikv_cop_wait", tbl: "tikv_cop_wait", labels: []string{"req"}},
		{name: "tikv_scheduler_command", tbl: "tikv_scheduler_command", labels: []string{"type"}},
		{name: "tikv_scheduler_latch_wait", tbl: "tikv_scheduler_latch_wait", labels: []string{"type"}},
		{name: "tikv_storage_async_request", tbl: "tikv_storage_async_request", labels: []string{"type"}},
		{name: "tikv_scheduler_processing_read", tbl: "tikv_scheduler_processing_read", labels: []string{"type"}},
		{name: "tikv_raft_propose_wait", tbl: "tikv_raftstore_propose_wait", labels: []string{"instance"}},
		{name: "tikv_raft_process", tbl: "tikv_raftstore_process", labels: []string{"type"}},
		{name: "tikv_raft_append_log", tbl: "tikv_raftstore_append_log", labels: []string{"instance"}},
		{name: "tikv_raft_commit_log", tbl: "tikv_raftstore_commit_log", labels: []string{"instance"}},
		{name: "tikv_raft_apply_wait", tbl: "tikv_raftstore_apply_wait", labels: []string{"instance"}},
		{name: "tikv_raft_apply_log", tbl: "tikv_raftstore_apply_log", labels: []string{"instance"}},
		{name: "tikv_raft_store_events", tbl: "tikv_raft_store_events", labels: []string{"type"}},
		{name: "tikv_handle_snapshot", tbl: "tikv_handle_snapshot", labels: []string{"type"}},
		{name: "tikv_send_snapshot", tbl: "tikv_send_snapshot", labels: []string{"instance"}},
		{name: "tikv_check_split", tbl: "tikv_check_split", labels: []string{"instance"}},
		{name: "tikv_ingest_sst", tbl: "tikv_ingest_sst", labels: []string{"instance"}},
		{name: "tikv_gc_tasks", tbl: "tikv_gc_tasks", labels: []string{"task"}},
		{name: "tikv_pd_request", tbl: "tikv_pd_request", labels: []string{"type"}},
		{name: "tikv_lock_manager_deadlock_detect", tbl: "tikv_lock_manager_deadlock_detect", labels: []string{"instance"}},
		{name: "tikv_lock_manager_waiter_lifetime", tbl: "tikv_lock_manager_waiter_lifetime", labels: []string{"instance"}},
		{name: "tikv_backup_range", tbl: "tikv_backup_range", labels: []string{"type"}},
		{name: "tikv_backup", tbl: "tikv_backup", labels: []string{"instance"}},
	}

	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	table := TableDef{
		Category:       []string{CategoryOverview},
		Title:          "total_time_consume",
		Comment:        ``,
		joinColumns:    []int{0, 1},
		compareColumns: []int{3, 4, 5},
		Column:         []string{"METRIC_NAME", "LABEL", "TIME_RATIO", "TOTAL_TIME", "TOTAL_COUNT", "P999", "P99", "P90", "P80"},
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
		return table, err
	}
	table.Rows = resultRows
	return table, nil
}

func GetTotalErrorTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
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
		{tbl: "tikv_coprocessor_request_error_total_count", labels: []string{"reason"}},
		{tbl: "tikv_engine_write_stall", labels: []string{"instance"}},
		{tbl: "tikv_server_report_failures_total_count", labels: []string{"instance"}},
		{name: "tikv_storage_async_request_error", tbl: "tikv_storage_async_requests_total_count", labels: []string{"type"}, condition: "status not in ('all','success')"},
		{tbl: "tikv_lock_manager_detect_error_total_count", labels: []string{"type"}},
		{tbl: "tikv_backup_errors_total_count", labels: []string{"error"}},
		{tbl: "node_network_in_errors_total_count", labels: []string{"instance"}},
		{tbl: "node_network_out_errors_total_count", labels: []string{"instance"}},
	}

	table := TableDef{
		Category:       []string{CategoryOverview},
		Title:          "total_error",
		Comment:        ``,
		joinColumns:    []int{0, 1},
		compareColumns: []int{2},
		Column:         []string{"METRIC_NAME", "LABEL", "TOTAL_COUNT"},
	}

	rows, err := getSumValueTableData(defs1, startTime, endTime, db)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetTiDBTimeConsumeTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []totalTimeByLabelsTableDef{
		{name: "tidb_query", tbl: "tidb_query", labels: []string{"instance", "sql_type"}},
		{name: "tidb_get_token(us)", tbl: "tidb_get_token", labels: []string{"instance"}},
		{name: "tidb_parse", tbl: "tidb_parse", labels: []string{"instance", "sql_type"}},
		{name: "tidb_compile", tbl: "tidb_compile", labels: []string{"instance", "sql_type"}},
		{name: "tidb_execute", tbl: "tidb_execute", labels: []string{"instance", "sql_type"}},
		{name: "tidb_distsql_execution", tbl: "tidb_distsql_execution", labels: []string{"instance", "type"}},
		{name: "tidb_cop", tbl: "tidb_cop", labels: []string{"instance"}},
		{name: "tidb_transaction", tbl: "tidb_transaction", labels: []string{"instance", "sql_type", "type"}},
		{name: "tidb_transaction_local_latch_wait", tbl: "tidb_transaction_local_latch_wait", labels: []string{"instance"}},
		{name: "tidb_kv_backoff", tbl: "tidb_kv_backoff", labels: []string{"instance", "type"}},
		{name: "tidb_kv_request", tbl: "tidb_kv_request", labels: []string{"instance", "store", "type"}},
		{name: "tidb_slow_query", tbl: "tidb_slow_query", labels: []string{"instance"}},
		{name: "tidb_slow_query_cop_process", tbl: "tidb_slow_query_cop_process", labels: []string{"instance"}},
		{name: "tidb_slow_query_cop_wait", tbl: "tidb_slow_query_cop_wait", labels: []string{"instance"}},
		{name: "tidb_ddl_handle_job", tbl: "tidb_ddl", labels: []string{"instance", "type"}},
		{name: "tidb_ddl_worker", tbl: "tidb_ddl_worker", labels: []string{"instance", "type", "result", "action"}},
		{name: "tidb_ddl_update_self_version", tbl: "tidb_ddl_update_self_version", labels: []string{"instance", "result"}},
		{name: "tidb_owner_handle_syncer", tbl: "tidb_owner_handle_syncer", labels: []string{"instance", "type", "result"}},
		{name: "tidb_ddl_batch_add_index", tbl: "tidb_ddl_batch_add_index", labels: []string{"instance", "type"}},
		{name: "tidb_ddl_deploy_syncer", tbl: "tidb_ddl_deploy_syncer", labels: []string{"instance", "type", "result"}},
		{name: "tidb_load_schema", tbl: "tidb_load_schema", labels: []string{"instance"}},
		{name: "tidb_meta_operation", tbl: "tidb_meta_operation", labels: []string{"instance", "type", "result"}},
		{name: "tidb_auto_id_request", tbl: "tidb_auto_id_request", labels: []string{"instance", "type"}},
		{name: "tidb_statistics_auto_analyze", tbl: "tidb_statistics_auto_analyze", labels: []string{"instance"}},
		{name: "tidb_gc", tbl: "tidb_gc", labels: []string{"instance"}},
		{name: "tidb_gc_push_task", tbl: "tidb_gc_push_task", labels: []string{"instance", "type"}},
		{name: "tidb_batch_client_unavailable", tbl: "tidb_batch_client_unavailable", labels: []string{"instance"}},
		{name: "tidb_batch_client_wait", tbl: "tidb_batch_client_wait", labels: []string{"instance"}},
		{name: "tidb_batch_client_wait_conn", tbl: "tidb_batch_client_wait_conn", labels: []string{"instance"}},
		{name: "pd_tso_rpc", tbl: "pd_tso_rpc", labels: []string{"instance"}},
		{name: "pd_tso_wait", tbl: "pd_tso_wait", labels: []string{"instance"}},
	}

	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	table := TableDef{
		Category:       []string{CategoryTiDB},
		Title:          "tidb_time_consume",
		Comment:        ``,
		joinColumns:    []int{0, 1},
		compareColumns: []int{3, 4, 5},
		Column:         []string{"METRIC_NAME", "LABEL", "TIME_RATIO", "TOTAL_TIME", "TOTAL_COUNT", "P999", "P99", "P90", "P80"},
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
		return table, err
	}
	table.Rows = resultRows
	return table, nil
}

func GetTiDBTxnTableData(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []totalValueAndTotalCountTableDef{
		{name: "tidb_transaction_retry_num", tbl: "tidb_transaction_retry_num", sumTbl: "tidb_transaction_retry_total_num", countTbl: "tidb_transaction_retry_num_total_count", labels: []string{"instance"}},
		{name: "tidb_transaction_statement_num", tbl: "tidb_transaction_statement_num", sumTbl: "tidb_transaction_statement_total_num", countTbl: "tidb_transaction_statement_num_total_count", labels: []string{"sql_type"}},
		{name: "tidb_txn_region_num", tbl: "tidb_txn_region_num", sumTbl: "tidb_txn_region_total_num", countTbl: "tidb_txn_region_num_total_count", labels: []string{"instance"}},
		{name: "tidb_txn_kv_write_num", tbl: "tidb_kv_write_num", sumTbl: "tidb_kv_write_total_num", countTbl: "tidb_kv_write_num_total_count", labels: []string{"instance"}},
		{name: "tidb_txn_kv_write_size", tbl: "tidb_kv_write_size", sumTbl: "tidb_kv_write_total_size", countTbl: "tidb_kv_write_size_total_count", labels: []string{"instance"}},
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
	table := TableDef{
		Category:       []string{CategoryTiDB},
		Title:          "transaction",
		Comment:        ``,
		joinColumns:    []int{0, 1},
		compareColumns: []int{2, 3, 4, 5},
		Column:         []string{"METRIC_NAME", "LABEL", "TOTAL_VALUE", "TOTAL_COUNT", "P999", "P99", "P90", "P80"},
	}

	specialHandle := func(row []string) []string {
		for len(row) < 8 {
			row = append(row, "")
		}

		for i := 2; i < len(row); i++ {
			if len(row[i]) == 0 {
				continue
			}
			if row[0] == "tidb_txn_kv_write_size" && i != 3 {
				row[i] = convertFloatToSize(row[i])
			} else {
				row[i] = convertFloatToInt(row[i])
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

	arg := &queryArg{
		startTime: startTime,
		endTime:   endTime,
		quantiles: quantiles,
	}

	err := getTableRows(defs, arg, db, appendRows)
	if err != nil {
		return table, err
	}
	table.Rows = resultRows
	return table, nil
}

func GetTiDBConnectionCountTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf("select instance, avg(value), max(value), min(value) from metrics_schema.tidb_connection_count where time >= '%s' and time < '%s' group by instance order by avg(value) desc",
		startTime, endTime)
	table := TableDef{
		Category:       []string{CategoryTiDB},
		Title:          "tidb_connection_count",
		Comment:        "",
		joinColumns:    []int{0},
		compareColumns: []int{1, 2, 3},
		Column:         []string{"INSTANCE", "AVG", "MAX", "MIN"},
	}
	rows, err := getSQLRoundRows(db, sql, []int{1, 2, 3}, "")
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetTiDBStatisticsInfo(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []sumValueQuery{
		{name: "pseudo_estimation_total_count", tbl: "tidb_statistics_pseudo_estimation_total_count", labels: []string{"instance"}},
		{name: "dump_feedback_total_count", tbl: "tidb_statistics_dump_feedback_total_count", labels: []string{"instance", "type"}},
		{name: "store_query_feedback_total_count", tbl: "tidb_statistics_store_query_feedback_total_count", labels: []string{"instance", "type"}},
		{name: "update_stats_total_count", tbl: "tidb_statistics_update_stats_total_count", labels: []string{"instance", "type"}},
	}

	table := TableDef{
		Category:       []string{CategoryTiDB},
		Title:          "statistics_info",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2},
		Column:         []string{"METRIC_NAME", "LABEL", "TOTAL_COUNT"},
	}

	rows, err := getSumValueTableData(defs1, startTime, endTime, db)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, err
}

func GetTiDBDDLOwner(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf("select min(time),instance from metrics_schema.tidb_ddl_worker_total_count where time>='%s' and time<'%s' and value>0 and type='run_job' group by instance order by min(time);",
		startTime, endTime)

	table := TableDef{
		Category:    []string{CategoryTiDB},
		Title:       "ddl_owner",
		Comment:     "",
		joinColumns: []int{1},
		Column:      []string{"MIN_TIME", "DDL OWNER"},
	}
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetPDConfigInfo(startTime, _ string, db *gorm.DB) (TableDef, error) {
	table := TableDef{
		Category:       []string{CategoryConfig},
		Title:          "scheduler_initial_config",
		Comment:        "",
		joinColumns:    []int{0, 2},
		compareColumns: []int{1},
		Column:         []string{"CONFIG_ITEM", "VALUE", "CURRENT_VALUE", "DIFF_WITH_CURRENT"},
	}
	sql := fmt.Sprintf(`select t1.type,t1.value,t2.value,t1.value!=t2.value from
		(select distinct type,value from metrics_schema.pd_scheduler_config where time = '%[1]s' and value>0) as t1 join
		(select distinct type,value from metrics_schema.pd_scheduler_config where time = now() and value>0) as t2
		where t1.type=t2.type order by abs(t2.value-t1.value) desc`, startTime)
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	if len(rows) > 0 {
		table.Rows = rows
	}
	return table, nil
}

func GetPDConfigChangeInfo(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf(`select t1.* from
		(select min(time) as time,type,value from metrics_schema.pd_scheduler_config where time>='%[1]s' and time<'%[2]s' group by type,value order by type) as t1 join
		(select type, count(distinct value) as count from metrics_schema.pd_scheduler_config where time>='%[1]s' and time<'%[2]s' group by type order by count desc) as t2
		where t1.type=t2.type and t2.count > 1 order by t2.count desc, t1.time;`, startTime, endTime)

	table := TableDef{
		Category:       []string{CategoryConfig},
		Title:          "scheduler_change_config",
		Comment:        "",
		joinColumns:    []int{1},
		compareColumns: []int{2},
		Column:         []string{"APPROXIMATE_CHANGE_TIME", "CONFIG_ITEM", "VALUE"},
	}
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetTiDBGCConfigInfo(startTime, _ string, db *gorm.DB) (TableDef, error) {
	table := TableDef{
		Category:       []string{CategoryConfig},
		Title:          "tidb_gc_initial_config",
		Comment:        "",
		joinColumns:    []int{0, 2},
		compareColumns: []int{1},
		Column:         []string{"CONFIG_ITEM", "VALUE", "CURRENT_VALUE", "DIFF_WITH_CURRENT"},
	}
	sql := fmt.Sprintf(`select t1.type,t1.value,t2.value,t1.value!=t2.value from
		(select distinct type,value from metrics_schema.tidb_gc_config where time = '%[1]s' and value>0) as t1 join
		(select distinct type,value from metrics_schema.tidb_gc_config where time = now() and value>0) as t2
		where t1.type=t2.type order by abs(t2.value-t1.value) desc`, startTime)
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetTiDBGCConfigChangeInfo(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf(`select t1.* from
		(select min(time) as time,type,value from metrics_schema.tidb_gc_config where time>='%[1]s' and time<'%[2]s' and value > 0 group by type,value order by type) as t1 join
		(select type, count(distinct value) as count from metrics_schema.tidb_gc_config where time>='%[1]s' and time<'%[2]s' and value > 0 group by type order by count desc) as t2
		where t1.type=t2.type and t2.count>1 order by t2.count desc, t1.time;`, startTime, endTime)

	table := TableDef{
		Category:       []string{CategoryConfig},
		Title:          "tidb_gc_change_config",
		Comment:        ``,
		joinColumns:    []int{1},
		compareColumns: []int{2},
		Column:         []string{"APPROXIMATE_CHANGE_TIME", "CONFIG_ITEM", "VALUE"},
	}
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetTiKVRocksDBConfigInfo(startTime, _ string, db *gorm.DB) (TableDef, error) {
	table := TableDef{
		Category:       []string{CategoryConfig},
		Title:          "tikv_rocksdb_initial_config",
		Comment:        "",
		joinColumns:    []int{0, 1, 3},
		compareColumns: []int{2},
		Column:         []string{"CONFIG_ITEM", "INSTANCE", "VALUE", "CURRENT_VALUE", "DIFF_WITH_CURRENT", "DISTINCT_VALUES_IN_INSTANCE"},
	}
	sql := fmt.Sprintf(`select t1.name,'', t1.value,t2.value,t1.value!=t2.value, t1.count from
		(select concat(name,' , ',cf) as name, min(value) as value, count(distinct value) as count from metrics_schema.tikv_config_rocksdb where time = '%[1]s' group by cf, name) as t1 join
		(select concat(name,' , ',cf) as name, min(value) as value from metrics_schema.tikv_config_rocksdb where time = now()   group by cf, name) as t2
		where t1.name=t2.name order by abs(t2.value-t1.value) desc,t1.count desc, t1.name`, startTime)
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	// var subRows []TableRowDef
	subRowsMap := make(map[string][][]string)
	for i, row := range rows {
		if len(row.Values) < 6 {
			continue
		}
		if row.Values[5] == "1" {
			continue
		}
		if len(subRowsMap) == 0 {
			sql = fmt.Sprintf(`select t1.name,t1.instance,t1.value,t2.value,t1.value!=t2.value, '' from
			(select concat(name,' , ',cf) as name,instance, value from metrics_schema.tikv_config_rocksdb where time = '%[1]s' group by cf, name, instance, value) as t1 join
			(select concat(name,' , ',cf) as name,instance, value from metrics_schema.tikv_config_rocksdb where time = now()   group by cf, name, instance, value) as t2
			where t1.name=t2.name and t1.instance = t2.instance order by abs(t2.value-t1.value) desc, t1.name`, startTime)
			subRows, err := getSQLRows(db, sql)
			if err != nil {
				return table, err
			}
			for _, subRow := range subRows {
				if len(subRow.Values) < 6 {
					continue
				}
				subRowsMap[subRow.Values[0]] = append(subRowsMap[subRow.Values[0]], subRow.Values)
			}
		}
		rows[i].SubValues = subRowsMap[row.Values[0]]
		if len(rows[i].SubValues) > 0 && row.Values[4] == "0" {
			for _, subRow := range rows[i].SubValues {
				if row.Values[4] != "0" {
					break
				}
				if len(subRow) != 6 {
					continue
				}
				rows[i].Values[4] = subRow[4]
			}
		}
	}
	table.Rows = rows
	return table, nil
}

func GetTiKVRocksDBConfigChangeInfo(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf(`select t1.* from
		(select min(time) as time,concat(name,' , ',cf) as name,instance,value from metrics_schema.tikv_config_rocksdb where time>='%[1]s' and time<'%[2]s'         group by name,cf,instance,value order by name) as t1 join
		(select concat(name,' , ',cf) as name,instance, count(distinct value) as count from metrics_schema.tikv_config_rocksdb where time>='%[1]s' and time<'%[2]s' group by name,cf,instance order by count desc) as t2
		where t1.name=t2.name and t1.instance = t2.instance and t2.count>1 order by t1.name,instance, t2.count desc, t1.time;`, startTime, endTime)

	table := TableDef{
		Category:       []string{CategoryConfig},
		Title:          "tikv_rocksdb_change_config",
		Comment:        ``,
		joinColumns:    []int{1, 2},
		compareColumns: []int{3},
		Column:         []string{"APPROXIMATE_CHANGE_TIME", "CONFIG_ITEM", "INSTANCE", "VALUE"},
	}
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetTiKVRaftStoreConfigInfo(startTime, _ string, db *gorm.DB) (TableDef, error) {
	table := TableDef{
		Category: []string{CategoryConfig},
		Title:    "tikv_raftstore_initial_config",
		Comment:  "",

		joinColumns:    []int{0, 1, 3},
		compareColumns: []int{2},
		Column:         []string{"CONFIG_ITEM", "INSTANCE", "VALUE", "CURRENT_VALUE", "DIFF_WITH_CURRENT", "DISTINCT_VALUES_IN_INSTANCE"},
	}
	sql := fmt.Sprintf(`select t1.name,'', t1.value,t2.value,t1.value!=t2.value, t1.count from
		(select name, min(value) as value, count(distinct value) as count from metrics_schema.tikv_config_raftstore where time = '%[1]s' group by name) as t1 join
		(select name, min(value) as value                                 from metrics_schema.tikv_config_raftstore where time = now()   group by name) as t2
		where t1.name=t2.name order by abs(t2.value-t1.value) desc,t1.count desc, t1.name`, startTime)
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	// var subRows []TableRowDef
	subRowsMap := make(map[string][][]string)
	for i, row := range rows {
		if len(row.Values) < 6 {
			continue
		}
		if row.Values[5] == "1" {
			continue
		}
		if len(subRowsMap) == 0 {
			sql = fmt.Sprintf(`select t1.name,t1.instance,t1.value,t2.value,t1.value!=t2.value, '' from
			(select name,instance, value from metrics_schema.tikv_config_raftstore where time = '%[1]s' group by name, instance, value) as t1 join
			(select name,instance, value from metrics_schema.tikv_config_raftstore where time = now()   group by name, instance, value) as t2
			where t1.name=t2.name and t1.instance = t2.instance order by abs(t2.value-t1.value) desc, t1.name`, startTime)
			subRows, err := getSQLRows(db, sql)
			if err != nil {
				return table, err
			}
			for _, subRow := range subRows {
				if len(subRow.Values) < 6 {
					continue
				}
				subRowsMap[subRow.Values[0]] = append(subRowsMap[subRow.Values[0]], subRow.Values)
			}
		}
		rows[i].SubValues = subRowsMap[row.Values[0]]
		if len(rows[i].SubValues) > 0 && row.Values[4] == "0" {
			for _, subRow := range rows[i].SubValues {
				if row.Values[4] != "0" {
					break
				}
				if len(subRow) != 6 {
					continue
				}
				rows[i].Values[4] = subRow[4]
			}
		}
	}
	table.Rows = rows
	return table, nil
}

func GetTiKVRaftStoreConfigChangeInfo(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf(`select t1.* from
		(select min(time) as time,name,instance,value from metrics_schema.tikv_config_raftstore where time>='%[1]s' and time<'%[2]s'         group by name,instance,value order by name) as t1 join
		(select name,instance, count(distinct value) as count from metrics_schema.tikv_config_raftstore where time>='%[1]s' and time<'%[2]s' group by name,instance order by count desc) as t2
		where t1.name=t2.name and t1.instance = t2.instance and t2.count>1 order by t1.name,instance,t2.count desc, t1.time;`, startTime, endTime)

	table := TableDef{
		Category:       []string{CategoryConfig},
		Title:          "tikv_raftstore_change_config",
		Comment:        ``,
		joinColumns:    []int{1, 2},
		compareColumns: []int{3},
		Column:         []string{"APPROXIMATE_CHANGE_TIME", "CONFIG_ITEM", "INSTANCE", "VALUE"},
	}
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetPDTimeConsumeTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []totalTimeByLabelsTableDef{
		{name: "pd_client_cmd", tbl: "pd_client_cmd", labels: []string{"instance", "type"}},
		{name: "pd_client_request_rpc", tbl: "pd_request_rpc", labels: []string{"instance", "type"}},
		{name: "pd_grpc_completed_commands", tbl: "pd_grpc_completed_commands", labels: []string{"instance", "grpc_method"}},
		{name: "pd_operator_finish", tbl: "pd_operator_finish", labels: []string{"type"}},
		{name: "pd_operator_step_finish", tbl: "pd_operator_step_finish", labels: []string{"type"}},
		{name: "pd_handle_transactions", tbl: "pd_handle_transactions", labels: []string{"instance", "result"}},
		{name: "pd_region_heartbeat", tbl: "pd_region_heartbeat", labels: []string{"address", "store"}},
		{name: "etcd_wal_fsync", tbl: "etcd_wal_fsync", labels: []string{"instance"}},
		{name: "pd_peer_round_trip", tbl: "pd_peer_round_trip", labels: []string{"instance", "To"}},
	}

	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	table := TableDef{
		Category:       []string{CategoryPD},
		Title:          "pd_time_consume",
		Comment:        ``,
		joinColumns:    []int{0, 1},
		compareColumns: []int{3, 4, 5},
		Column:         []string{"METRIC_NAME", "LABEL", "TIME_RATIO", "TOTAL_TIME", "TOTAL_COUNT", "P999", "P99", "P90", "P80"},
	}

	resultRows := make([]TableRowDef, 0, len(defs))
	arg := newQueryArg(startTime, endTime)
	appendRows := func(row TableRowDef) {
		resultRows = append(resultRows, row)
		arg.totalTime = 0
	}

	err := getTableRows(defs, arg, db, appendRows)
	if err != nil {
		return table, err
	}
	table.Rows = resultRows
	return table, nil
}

func GetPDSchedulerInfo(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []sumValueQuery{
		{name: "blance-leader-in", tbl: "pd_scheduler_balance_leader", condition: "type='move-leader' and address like '%-in'", labels: []string{"address"}},
		{name: "blance-leader-out", tbl: "pd_scheduler_balance_leader", condition: "type='move-leader' and address like '%-out'", labels: []string{"address"}},
		{name: "blance-region-in", tbl: "pd_scheduler_balance_region", condition: "type='move-peer' and address like '%-in'", labels: []string{"address"}},
		{name: "blance-region-out", tbl: "pd_scheduler_balance_region", condition: "type='move-peer' and address like '%-out'", labels: []string{"address"}},
	}

	table := TableDef{
		Category:       []string{CategoryPD},
		Title:          "balance_leader_region",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2},
		Column:         []string{"METRIC_NAME", "LABEL", "TOTAL_COUNT"},
	}

	rows, err := getSumValueTableData(defs1, startTime, endTime, db)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, err
}

func GetTiKVRegionSizeInfo(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []totalValueAndTotalCountTableDef{
		{name: "Approximate Region size", tbl: "tikv_approximate_region_size", sumTbl: "tikv_approximate_region_total_size", countTbl: "tikv_approximate_region_size_total_count", labels: []string{"instance"}},
	}
	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}
	resultRows := make([]TableRowDef, 0, len(defs))

	specialHandle := func(row []string) []string {
		if len(row) == 8 {
			// total value and total count is not right.
			tmpRow := row[:2]
			tmpRow = append(tmpRow, row[4:]...)
			row = tmpRow
		}
		for i := 2; i < len(row); i++ {
			if len(row[i]) == 0 {
				continue
			}
			row[i] = convertFloatToSize(row[i])
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

	quantiles := []float64{0.99, 0.90, 0.80, 0.50}
	arg := &queryArg{
		startTime: startTime,
		endTime:   endTime,
		quantiles: quantiles,
	}

	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "approximate_region_size",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2, 3, 4, 5},
		Column:         []string{"METRIC_NAME", "LABEL", "P99", "P90", "P80", "P50"},
	}
	err := getTableRows(defs, arg, db, appendRows)
	if err != nil {
		return table, err
	}
	table.Rows = resultRows
	return table, nil
}

func GetTiKVStoreInfo(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []sumValueQuery{
		{name: "store size", tbl: "tikv_engine_size", labels: []string{"instance", "type"}},
	}
	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "tikv_engine_size",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2},
		Column:         []string{"METRIC_NAME", "LABEL", "TOTAL_COUNT"},
	}
	rows, err := getSumValueTableData(defs1, startTime, endTime, db)
	if err != nil {
		return table, err
	}
	convertFloatToSizeByRows(rows, 2)
	table.Rows = rows
	return table, nil
}

func GetTiKVTotalTimeConsumeTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []totalTimeByLabelsTableDef{
		{name: "tikv_grpc_message", tbl: "tikv_grpc_message", labels: []string{"instance", "type"}},
		{name: "tikv_cop_request", tbl: "tikv_cop_request", labels: []string{"instance", "req"}},
		{name: "tikv_cop_handle", tbl: "tikv_cop_handle", labels: []string{"instance", "req"}},
		{name: "tikv_cop_wait", tbl: "tikv_cop_wait", labels: []string{"instance", "req"}},
		{name: "tikv_scheduler_command", tbl: "tikv_scheduler_command", labels: []string{"instance", "type"}},
		{name: "tikv_scheduler_latch_wait", tbl: "tikv_scheduler_latch_wait", labels: []string{"instance", "type"}},
		{name: "tikv_storage_async_request", tbl: "tikv_storage_async_request", labels: []string{"instance", "type"}},
		{name: "tikv_scheduler_processing_read", tbl: "tikv_scheduler_processing_read", labels: []string{"type"}},
		{name: "tikv_raft_propose_wait", tbl: "tikv_raftstore_propose_wait", labels: []string{"instance"}},
		{name: "tikv_raft_process", tbl: "tikv_raftstore_process", labels: []string{"instance", "type"}},
		{name: "tikv_raft_append_log", tbl: "tikv_raftstore_append_log", labels: []string{"instance"}},
		{name: "tikv_raft_commit_log", tbl: "tikv_raftstore_commit_log", labels: []string{"instance"}},
		{name: "tikv_raft_apply_wait", tbl: "tikv_raftstore_apply_wait", labels: []string{"instance"}},
		{name: "tikv_raft_apply_log", tbl: "tikv_raftstore_apply_log", labels: []string{"instance"}},
		{name: "tikv_raft_store_events", tbl: "tikv_raft_store_events", labels: []string{"instance", "type"}},
		{name: "tikv_handle_snapshot", tbl: "tikv_handle_snapshot", labels: []string{"instance", "type"}},
		{name: "tikv_send_snapshot", tbl: "tikv_send_snapshot", labels: []string{"instance"}},
		{name: "tikv_check_split", tbl: "tikv_check_split", labels: []string{"instance"}},
		{name: "tikv_ingest_sst", tbl: "tikv_ingest_sst", labels: []string{"instance"}},
		{name: "tikv_gc_tasks", tbl: "tikv_gc_tasks", labels: []string{"instance", "task"}},
		{name: "tikv_pd_request", tbl: "tikv_pd_request", labels: []string{"instance", "type"}},
		{name: "tikv_lock_manager_deadlock_detect", tbl: "tikv_lock_manager_deadlock_detect", labels: []string{"instance"}},
		{name: "tikv_lock_manager_waiter_lifetime", tbl: "tikv_lock_manager_waiter_lifetime", labels: []string{"instance"}},
		{name: "tikv_backup_range", tbl: "tikv_backup_range", labels: []string{"instance", "type"}},
		{name: "tikv_backup", tbl: "tikv_backup", labels: []string{"instance"}},
	}

	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "tikv_time_consume",
		Comment:        ``,
		joinColumns:    []int{0, 1},
		compareColumns: []int{3, 4, 5},
		Column:         []string{"METRIC_NAME", "LABEL", "TIME_RATIO", "TOTAL_TIME", "TOTAL_COUNT", "P999", "P99", "P90", "P80"},
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
		return table, err
	}
	table.Rows = resultRows
	return table, nil
}

func GetTiKVSchedulerInfo(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []totalValueAndTotalCountTableDef{
		{name: "tikv_scheduler_keys_read", tbl: "tikv_scheduler_keys_read", sumTbl: "tikv_scheduler_keys_total_read", countTbl: "tikv_scheduler_keys_read_total_count", labels: []string{"instance", "type"}},
		{name: "tikv_scheduler_keys_written", tbl: "tikv_scheduler_keys_written", sumTbl: "tikv_scheduler_keys_total_written", countTbl: "tikv_scheduler_keys_written_total_count", labels: []string{"instance", "type"}},
	}
	defs2 := []sumValueQuery{
		{tbl: "tikv_scheduler_scan_details_total_num", labels: []string{"instance", "req", "tag"}},
		{tbl: "tikv_scheduler_stage_total_num", labels: []string{"instance", "type", "stage"}},
	}

	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}
	for i := range defs2 {
		defs = append(defs, defs2[i])
	}

	resultRows := make([]TableRowDef, 0, len(defs))
	specialHandle := func(row []string) []string {
		for len(row) < 8 {
			row = append(row, "")
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

	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "scheduler_info",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2, 3, 4, 5},
		Column:         []string{"METRIC_NAME", "LABEL", "TOTAL_VALUE", "TOTAL_COUNT", "P999", "P99", "P90", "P80"},
	}
	arg := newQueryArg(startTime, endTime)
	err := getTableRows(defs, arg, db, appendRows)
	if err != nil {
		return table, err
	}
	table.Rows = resultRows
	return table, nil
}

func GetTiKVGCInfo(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []sumValueQuery{
		{tbl: "tikv_gc_keys_total_num", labels: []string{"instance", "cf", "tag"}},
		{name: "tidb_gc_worker_action_total_num", tbl: "tidb_gc_worker_action_opm", labels: []string{"instance", "type"}},
	}

	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "gc_info",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2},
		Column:         []string{"METRIC_NAME", "LABEL", "TOTAL_VALUE"},
	}
	rows, err := getSumValueTableData(defs1, startTime, endTime, db)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetTiKVTaskInfo(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []sumValueQuery{
		{tbl: "tikv_worker_handled_tasks_total_num", labels: []string{"instance", "name"}},
		{tbl: "tikv_worker_pending_tasks_total_num", labels: []string{"instance", "name"}},
		{tbl: "tikv_futurepool_handled_tasks_total_num", labels: []string{"instance", "name"}},
		{tbl: "tikv_futurepool_pending_tasks_total_num", labels: []string{"instance", "name"}},
	}

	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "task_info",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2},
		Column:         []string{"METRIC_NAME", "LABEL", "TOTAL_VALUE"},
	}
	rows, err := getSumValueTableData(defs1, startTime, endTime, db)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func getSumValueTableData(defs1 []sumValueQuery, startTime, endTime string, db *gorm.DB) ([]TableRowDef, error) {
	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	resultRows := make([]TableRowDef, 0, len(defs))
	specialHandle := func(row []string) []string {
		for len(row) < 3 {
			return row
		}
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
	arg := newQueryArg(startTime, endTime)
	err := getTableRows(defs, arg, db, appendRows)
	if err != nil {
		return nil, err
	}
	return resultRows, nil
}

func GetTiKVSnapshotInfo(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []totalValueAndTotalCountTableDef{
		{name: "tikv_snapshot_kv_count", tbl: "tikv_snapshot_kv_count", sumTbl: "tikv_snapshot_kv_total_count", countTbl: "tikv_snapshot_kv_count_total_count", labels: []string{"instance"}},
		{name: "tikv_snapshot_size", tbl: "tikv_snapshot_size", sumTbl: "tikv_snapshot_total_size", countTbl: "tikv_snapshot_size_total_count", labels: []string{"instance"}},
	}
	defs2 := []sumValueQuery{
		{tbl: "tikv_snapshot_state_total_count", labels: []string{"instance", "type"}},
	}
	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}
	for i := range defs2 {
		defs = append(defs, defs2[i])
	}

	resultRows := make([]TableRowDef, 0, len(defs))
	specialHandle := func(row []string) []string {
		for len(row) < 8 {
			row = append(row, "")
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

	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "snapshot_info",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2, 3, 4, 5},
		Column:         []string{"METRIC_NAME", "LABEL", "TOTAL_VALUE", "TOTAL_COUNT", "P999", "P99", "P90", "P80"},
	}
	arg := newQueryArg(startTime, endTime)
	err := getTableRows(defs, arg, db, appendRows)
	if err != nil {
		return table, err
	}
	table.Rows = resultRows
	return table, nil
}

func GetTiKVCopInfo(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []sumValueQuery{
		{name: "tikv_cop_scan_keys_num", tbl: "tikv_cop_scan_keys_total_num", labels: []string{"instance", "req"}},
		{tbl: "tikv_cop_total_response_total_size", labels: []string{"instance"}},
		{name: "tikv_cop_scan_num", tbl: "tikv_cop_scan_details_total", labels: []string{"instance", "req", "tag", "cf"}},
	}
	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}
	resultRows := make([]TableRowDef, 0, len(defs))
	appendRows := func(row TableRowDef) {
		if len(row.Values) == 3 && row.Values[0] == "tikv_cop_total_response_total_size" {
			convertFloatToSizeByRow(&row, 2)
		}
		resultRows = append(resultRows, row)
	}

	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "coprocessor_info",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2},
		Column:         []string{"METRIC_NAME", "LABEL", "TOTAL_VALUE"},
	}
	arg := newQueryArg(startTime, endTime)
	err := getTableRows(defs, arg, db, appendRows)
	if err != nil {
		return table, err
	}
	table.Rows = resultRows
	return table, nil
}

func GetTiKVRaftInfo(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []sumValueQuery{
		{tbl: "tikv_raft_sent_messages_total_num", labels: []string{"instance", "type"}},
		{tbl: "tikv_flush_messages_total_num", labels: []string{"instance"}},
		{tbl: "tikv_receive_messages_total_num", labels: []string{"instance"}},
		{tbl: "tikv_raft_dropped_messages_total", labels: []string{"instance", "type"}},
		{tbl: "tikv_raft_proposals_total_num", labels: []string{"instance", "type"}},
	}
	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}
	resultRows := make([]TableRowDef, 0, len(defs))
	appendRows := func(row TableRowDef) {
		resultRows = append(resultRows, row)
	}
	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "raft_info",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2},
		Column:         []string{"METRIC_NAME", "LABEL", "TOTAL_VALUE"},
	}
	arg := newQueryArg(startTime, endTime)
	err := getTableRows(defs, arg, db, appendRows)
	if err != nil {
		return table, err
	}
	table.Rows = resultRows
	return table, nil
}

func GetTiKVErrorTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []sumValueQuery{
		{tbl: "tikv_grpc_error_total_count", labels: []string{"instance", "type"}},
		{tbl: "tikv_critical_error_total_count", labels: []string{"instance", "type"}},
		{tbl: "tikv_scheduler_is_busy_total_count", labels: []string{"instance", "db", "type", "stage"}},
		{tbl: "tikv_channel_full_total_count", labels: []string{"instance", "db", "type"}},
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

	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "tikv_error",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2},
		Column:         []string{"METRIC_NAME", "LABEL", "TOTAL_COUNT"},
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
		return table, err
	}
	table.Rows = resultRows
	return table, nil
}

func GetTiDBCurrentConfig(_, _ string, db *gorm.DB) (TableDef, error) {
	sql := "select `key`,`value` from information_schema.CLUSTER_CONFIG where type='tidb' group by `key`,`value` order by `key`;"
	table := TableDef{
		Category: []string{CategoryConfig},
		Title:    "tidb_current_config",
		Comment:  "",
		Column:   []string{"KEY", "VALUE"},
	}
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetPDCurrentConfig(_, _ string, db *gorm.DB) (TableDef, error) {
	sql := "select `key`,`value` from information_schema.CLUSTER_CONFIG where type='pd' group by `key`,`value` order by `key`;"
	table := TableDef{
		Category: []string{CategoryConfig},
		Title:    "pd_current_config",
		Comment:  "",
		Column:   []string{"KEY", "VALUE"},
	}
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetTiKVCurrentConfig(_, _ string, db *gorm.DB) (TableDef, error) {
	sql := "select `key`,`value` from information_schema.CLUSTER_CONFIG where type='tikv' group by `key`,`value` order by `key`;"
	table := TableDef{
		Category: []string{CategoryConfig},
		Title:    "tikv_current_config",
		Comment:  "",
		Column:   []string{"KEY", "VALUE"},
	}
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func getSQLRows(db *gorm.DB, sql string) ([]TableRowDef, error) {
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

func getSQLRoundRows(db *gorm.DB, sql string, nums []int, comment string) ([]TableRowDef, error) {
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	for _, i := range nums {
		for _, row := range rows {
			row[i] = RoundFloatString(row[i])
		}
	}
	resultRows := make([]TableRowDef, len(rows))
	for i := range rows {
		resultRows[i] = TableRowDef{Values: rows[i], Comment: comment}
	}
	return resultRows, nil
}

func getTableRows(defs []rowQuery, arg *queryArg, db *gorm.DB, appendRows func(def TableRowDef)) error {
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

func getAvgValueTableData(defs1 []AvgMaxMinTableDef, startTime, endTime string, db *gorm.DB) ([]TableRowDef, error) {
	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	resultRows := make([]TableRowDef, 0, len(defs))
	appendRows := func(row TableRowDef) {
		resultRows = append(resultRows, row)
	}
	arg := newQueryArg(startTime, endTime)
	err := getTableRows(defs, arg, db, appendRows)
	if err != nil {
		return nil, err
	}
	return resultRows, nil
}

func GetLoadTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []AvgMaxMinTableDef{
		{name: "node_disk_io_utilization", tbl: "node_disk_io_util", labels: []string{"instance", "device"}},
		{name: "node_disk_write_latency", tbl: "node_disk_write_latency", labels: []string{"instance", "device"}},
		{name: "node_disk_read_latency", tbl: "node_disk_read_latency", labels: []string{"instance", "device"}},
		{name: "tikv_disk_read_bytes", tbl: "tikv_disk_read_bytes", labels: []string{"instance", "device"}},
		{name: "tikv_disk_write_bytes", tbl: "tikv_disk_write_bytes", labels: []string{"instance", "device"}},
		{name: "node_network_in_traffic", tbl: "node_network_in_traffic", labels: []string{"instance", "device"}},
		{name: "node_network_out_traffic", tbl: "node_network_out_traffic", labels: []string{"instance", "device"}},
		{name: "node_tcp_in_use", tbl: "node_tcp_in_use", labels: []string{"instance"}},
		{name: "node_tcp_connections", tbl: "node_tcp_connections", labels: []string{"instance"}},
	}
	table := TableDef{
		Category:       []string{CategoryLoad},
		Title:          "node_load_info",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2, 3, 4},
		Column:         []string{"METRIC_NAME", "instance", "AVG", "MAX", "MIN"},
	}
	rows := make([]TableRowDef, 0, 4)
	// get cpu usage
	row, err := getAvgMaxMinCPUUsage(startTime, endTime, db)
	if err != nil {
		return table, err
	}
	rows = append(rows, *row)
	// get memory usage
	row, err = getAvgMaxMinMemoryUsage(startTime, endTime, db)
	if err != nil {
		return table, err
	}
	rows = append(rows, *row)
	partRows, err := getAvgValueTableData(defs1, startTime, endTime, db)
	if err != nil {
		return table, err
	}
	specialHandle := func(row []string) []string {
		if len(row) < 5 {
			return row
		}
		for i := 2; i < 5; i++ {
			if len(row[i]) == 0 {
				continue
			}
			switch row[0] {
			case "node_disk_io_utilization":
				f, err := strconv.ParseFloat(row[i], 64)
				if err != nil {
					return row
				}
				row[i] = convertFloatToString(f*100) + "%"
			case "node_disk_write_latency", "node_disk_read_latency":
				row[i] = convertFloatToDuration(row[i], float64(1))
			case "node_tcp_in_use", "node_tcp_connections":
				row[i] = convertFloatToInt(row[i])
			default:
				row[i] = convertFloatToSize(row[i])
			}
		}
		return row
	}
	for _, row := range partRows {
		row.Values = specialHandle(row.Values)
		for i := range row.SubValues {
			row.SubValues[i] = specialHandle(row.SubValues[i])
		}
	}
	rows = append(rows, partRows...)
	table.Rows = rows
	return table, nil
}

func getAvgMaxMinCPUUsage(startTime, endTime string, db *gorm.DB) (*TableRowDef, error) {
	condition := fmt.Sprintf("where time >= '%s' and time < '%s' ", startTime, endTime)
	sql := fmt.Sprintf("select 'node_cpu_usage', '', 100-avg(value),100-min(value),100-max(value) from metrics_schema.node_cpu_usage %s and mode='idle'", condition)
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}
	sql = fmt.Sprintf("select 'node_cpu_usage', instance, 100-avg(value) as avg_value,100-min(value),100-max(value) from metrics_schema.node_cpu_usage %s and mode='idle' group by instance order by avg_value desc", condition)
	subRows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	specialHandle := func(row []string) []string {
		if len(row) == 0 {
			return row
		}
		for i := 2; i <= 4; i++ {
			if len(row[i]) > 0 {
				row[i] = RoundFloatString(row[i]) + "%"
			}
		}
		return row
	}
	rows[0] = specialHandle(rows[0])
	for i := range subRows {
		subRows[i] = specialHandle(subRows[i])
	}
	return &TableRowDef{
		Values:    rows[0],
		SubValues: subRows,
	}, nil
}

func getAvgMaxMinMemoryUsage(startTime, endTime string, db *gorm.DB) (*TableRowDef, error) {
	condition := fmt.Sprintf("where time >= '%s' and time < '%s' ", startTime, endTime)
	sql := fmt.Sprintf(`select 'node_mem_usage','', 100*(1-t1.avg_value/t2.total),100*(1-t1.min_value/t2.total), 100*(1-t1.max_value/t2.total) from
			(select avg(value) as avg_value,max(value) as max_value,min(value) as min_value from metrics_schema.node_memory_available %[1]s) as t1 join
			(select max(value) as total from metrics_schema.node_total_memory %[1]s) as t2;`, condition)
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}
	sql = fmt.Sprintf(`select 'node_mem_usage',t1.instance, 100*(1-t1.avg_value/t2.total) as avg_value, 100*(1-t1.min_value/t2.total), 100*(1-t1.max_value/t2.total)  from
			(select instance, avg(value) as avg_value,max(value) as max_value,min(value) as min_value from metrics_schema.node_memory_available %[1]s GROUP BY instance) as t1 join
			(select instance, max(value) as total from metrics_schema.node_total_memory %[1]s GROUP BY instance) as t2 where t1.instance = t2.instance order by avg_value desc;`, condition)
	subRows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	specialHandle := func(row []string) []string {
		if len(row) == 0 {
			return row
		}
		for i := 2; i <= 4; i++ {
			if len(row[i]) > 0 {
				row[i] = RoundFloatString(row[i]) + "%"
			}
		}
		return row
	}
	rows[0] = specialHandle(rows[0])
	for i := range subRows {
		subRows[i] = specialHandle(subRows[i])
	}
	return &TableRowDef{
		Values:    rows[0],
		SubValues: subRows,
	}, nil
}

func GetCPUUsageTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf("select instance, job, avg(value),max(value),min(value) from metrics_schema.process_cpu_usage where time >= '%s' and time < '%s' and job not in ('overwritten-nodes','overwritten-cluster') group by instance, job order by avg(value) desc",
		startTime, endTime)
	table := TableDef{
		Category:       []string{CategoryLoad},
		Title:          "process_cpu_usage",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2, 3, 4},
		Column:         []string{"INSTANCE", "JOB", "AVG", "MAX", "MIN"},
	}
	rows, err := getSQLRoundRows(db, sql, []int{2, 3, 4}, "")
	if err != nil {
		return table, err
	}
	specialHandle := func(row []string) []string {
		if len(row) < 5 {
			return row
		}
		for i := 2; i < 5; i++ {
			f, err := strconv.ParseFloat(row[i], 64)
			if err != nil {
				return row
			}
			row[i] = convertFloatToString(f*100) + "%"
		}
		return row
	}
	for i := range rows {
		rows[i].Values = specialHandle(rows[i].Values)
	}
	table.Rows = rows
	return table, nil
}

func GetProcessMemUsageTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf("select instance, job, avg(value),max(value),min(value) from metrics_schema.tidb_process_mem_usage where time >= '%s' and time < '%s' and job not in ('overwritten-nodes','overwritten-cluster') group by instance, job order by avg(value) desc",
		startTime, endTime)
	table := TableDef{
		Category:       []string{CategoryLoad},
		Title:          "process_memory_usage",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2, 3, 4},
		Column:         []string{"INSTANCE", "JOB", "AVG", "MAX", "MIN"},
	}
	rows, err := getSQLRoundRows(db, sql, []int{2, 3, 4}, "")
	if err != nil {
		return table, err
	}
	specialHandle := func(row []string) []string {
		if len(row) < 5 {
			return row
		}
		for i := 2; i < 5; i++ {
			row[i] = convertFloatToSize(row[i])
		}
		return row
	}
	for i := range rows {
		rows[i].Values = specialHandle(rows[i].Values)
	}
	table.Rows = rows
	return table, nil
}

func GetGoroutinesCountTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf("select instance, job, avg(value), max(value), min(value) from metrics_schema.goroutines_count where job in ('tidb','pd') and time >= '%s' and time < '%s' group by instance, job order by avg(value) desc",
		startTime, endTime)
	table := TableDef{
		Category:       []string{CategoryLoad},
		Title:          "tidb/pd_goroutines_count",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2, 3, 4},
		Column:         []string{"INSTANCE", "JOB", "AVG", "MAX", "MIN"},
	}
	rows, err := getSQLRoundRows(db, sql, []int{2, 3, 4}, "")
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetTiKVThreadCPUTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs := []AvgMaxMinTableDef{
		{name: "grpc", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name like 'grpc%'"},
		{name: "raftstore", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name like 'raftstore_%'"},
		{name: "Async apply", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name like 'apply%'"},
		{name: "sched_worker", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name like 'sched_%'"},
		{name: "snapshot", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name like 'snap%'"},
		{name: "unified read pool", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name like 'unified_read_po%'"},
		{name: "storage read pool", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name like 'store_read%'"},
		{name: "storage read pool normal", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name like 'store_read_norm%'"},
		{name: "storage read pool high", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name like 'store_read_high%'"},
		{name: "storage read pool low", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name like 'store_read_low%'"},
		{name: "cop", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name like 'cop%'"},
		{name: "cop normal", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name like 'cop_normal%'"},
		{name: "cop high", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name like 'cop_high%'"},
		{name: "cop low", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name like 'cop_low%'"},
		{name: "rocksdb", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name like 'rocksdb%'"},
		{name: "gc", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name like 'gc_worker%'"},
		{name: "split_check", tbl: "tikv_thread_cpu", labels: []string{"instance"}, condition: "name = 'split_check'"},
	}
	configKeys := map[string]string{
		"grpc":                     "server.grpc-concurrency",
		"sched_worker":             "storage.scheduler-worker-pool-size",
		"raftstore":                "raftstore.store-pool-size",
		"Async apply":              "raftstore.apply-pool-size",
		"unified read pool":        "readpool.unified.max-thread-count",
		"storage read pool high":   "readpool.storage.high-concurrency",
		"storage read pool low":    "readpool.storage.low-concurrency",
		"storage read pool normal": "readpool.storage.normal-concurrency",
		"cop high":                 "readpool.coprocessor.high-concurrency",
		"cop low":                  "readpool.coprocessor.low-concurrency",
		"cop normal":               "readpool.coprocessor.normal-concurrency",
	}
	table := TableDef{
		Category:       []string{CategoryLoad},
		Title:          "tikv_thread_cpu_usage",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2, 3, 4},
		Column:         []string{"METRIC_NAME", "INSTANCE", "AVG", "MAX", "MIN", "CONFIG_KEY", "CURRENT_CONFIG_VALUE"},
	}
	type instanceKey struct {
		instance string
		key      string
	}
	var keysBuf bytes.Buffer
	idx := 0
	for _, v := range configKeys {
		if idx > 0 {
			keysBuf.WriteByte(',')
		}
		keysBuf.WriteByte('\'')
		keysBuf.WriteString(v)
		keysBuf.WriteByte('\'')
		idx++
	}
	sql := fmt.Sprintf("select t2.status_address, t1.`key`,t1.value from (select instance, `key`,value from information_schema.cluster_config where type='tikv' and `key` in (%s) ) as t1 join "+
		"(select instance,status_address from information_schema.cluster_info where type='tikv') as t2 where t1.instance=t2.instance", keysBuf.String())
	rows, err := querySQL(db, sql)
	if err != nil {
		return table, err
	}
	cfgMap := make(map[instanceKey]string)
	for _, row := range rows {
		cfgMap[instanceKey{
			instance: row[0],
			key:      row[1],
		}] = row[2]
	}
	specialHandle := func(row []string) []string {
		if len(row) < 7 {
			return row
		}
		for i := 2; i < 5; i++ {
			f, err := strconv.ParseFloat(row[i], 64)
			if err != nil {
				return row
			}
			row[i] = convertFloatToString(f*100) + "%"
		}
		// get config value
		if cfgValue, ok := cfgMap[instanceKey{
			instance: row[1],
			key:      configKeys[row[0]],
		}]; ok {
			row[5] = configKeys[row[0]]
			row[6] = cfgValue
		}
		return row
	}
	resultRows := make([]TableRowDef, 0, len(defs))
	appendRows := func(row TableRowDef) {
		row.Values = specialHandle(row.Values)
		for i := range row.SubValues {
			row.SubValues[i] = specialHandle(row.SubValues[i])
		}
		resultRows = append(resultRows, row)
	}

	for _, def := range defs {
		condition := fmt.Sprintf("where time >= '%s' and time < '%s' ", startTime, endTime)
		if len(def.condition) > 0 {
			condition = condition + "and " + def.condition
		}
		sql := fmt.Sprintf("select '%[1]s', '', avg(sum_value),max(sum_value),min(sum_value),'','' from ( select sum(value) as sum_value from metrics_schema.%[2]s %[3]s group by %[4]s, time) as t1",
			def.name, def.tbl, condition, def.labels[0])
		rows, err := querySQL(db, sql)
		if err != nil {
			return table, err
		}
		if len(rows) == 0 {
			continue
		}
		sql = fmt.Sprintf("select '%[1]s', %[2]s,avg(sum_value),max(sum_value),min(sum_value),'','' from ( select %[2]s,sum(value) as sum_value from metrics_schema.%[3]s %[4]s group by %[2]s,time) as t1 group by %[2]s order by avg(sum_value) desc",
			def.name, def.labels[0], def.tbl, condition)
		subRows, err := querySQL(db, sql)
		if err != nil {
			return table, err
		}
		appendRows(TableRowDef{
			Values:    rows[0],
			SubValues: subRows,
			Comment:   def.Comment,
		})
	}
	sortRowsByIndex(resultRows, 2)
	table.Rows = resultRows
	return table, nil
}

func GetStoreStatusTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []AvgMaxMinTableDef{
		{name: "region_score", tbl: "pd_scheduler_store_status", condition: "type = 'region_score'", labels: []string{"address"}},
		{name: "leader_score", tbl: "pd_scheduler_store_status", condition: "type = 'leader_score'", labels: []string{"address"}},
		{name: "region_count", tbl: "pd_scheduler_store_status", condition: "type = 'region_count'", labels: []string{"address"}},
		{name: "leader_count", tbl: "pd_scheduler_store_status", condition: "type = 'leader_count'", labels: []string{"address"}},
		{name: "region_size", tbl: "pd_scheduler_store_status", condition: "type = 'region_size'", labels: []string{"address"}},
		{name: "leader_size", tbl: "pd_scheduler_store_status", condition: "type = 'leader_size'", labels: []string{"address"}},
	}
	table := TableDef{
		Category:       []string{CategoryPD},
		Title:          "store_status",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2, 3, 4},
		Column:         []string{"METRIC_NAME", "INSTANCE", "AVG", "MAX", "MIN"},
	}
	rows, err := getAvgValueTableData(defs1, startTime, endTime, db)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetPDClusterStatusTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf("select type, max(value), min(value) from metrics_schema.pd_cluster_status where time >= '%s' and time < '%s' group by type",
		startTime, endTime)
	table := TableDef{
		Category:       []string{CategoryPD},
		Title:          "cluster_status",
		Comment:        "",
		joinColumns:    []int{0},
		compareColumns: []int{1, 2},
		Column:         []string{"TYPE", "MAX", "MIN"},
	}
	rows, err := getSQLRoundRows(db, sql, []int{1, 2}, "")
	if err != nil {
		return table, err
	}
	for i := range rows {
		if len(rows[i].Values) != 3 {
			continue
		}
		switch rows[i].Values[0] {
		case "store_disconnected_count":
		case "leader_count":
			rows[i].Comment = "The total number of leader Regions"
		case "store_up_count":
			rows[i].Comment = "The count of healthy stores"
		case "storage_capacity", "storage_size":
			rows[i].Values[1] = convertFloatToSize(rows[i].Values[1])
			rows[i].Values[2] = convertFloatToSize(rows[i].Values[2])
		}
	}
	table.Rows = rows
	return table, nil
}

func GetPDEtcdStatusTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf("select type, max(value), min(value) from metrics_schema.pd_server_etcd_state where time >= '%s' and time < '%s' group by type",
		startTime, endTime)
	table := TableDef{
		Category:       []string{CategoryPD},
		Title:          "etcd_status",
		Comment:        "",
		joinColumns:    []int{0},
		compareColumns: []int{1, 2},
		Column:         []string{"TYPE", "MAX", "MIN"},
	}
	rows, err := getSQLRoundRows(db, sql, []int{1, 2}, "")
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetClusterInfoTable(_, _ string, db *gorm.DB) (TableDef, error) {
	sql := "select * from information_schema.cluster_info order by type,start_time desc"
	table := TableDef{
		Category:    []string{CategoryHeader},
		Title:       "cluster_info",
		Comment:     "",
		joinColumns: []int{0, 1, 2, 3, 4},
		Column:      []string{"TYPE", "INSTANCE", "STATUS_ADDRESS", "VERSION", "GIT_HASH", "START_TIME", "UPTIME"},
	}
	rows, err := getSQLRoundRows(db, sql, nil, "")
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetTiKVCacheHitTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	tables := []AvgMaxMinTableDef{
		{name: "tikv_memtable_hit", tbl: "tikv_memtable_hit", labels: []string{"instance"}},
		{name: "tikv_block_all_cache_hit", tbl: "tikv_block_all_cache_hit", labels: []string{"instance"}},
		{name: "tikv_block_index_cache_hit", tbl: "tikv_block_index_cache_hit", labels: []string{"instance"}},
		{name: "tikv_block_filter_cache_hit", tbl: "tikv_block_filter_cache_hit", labels: []string{"instance"}},
		{name: "tikv_block_data_cache_hit", tbl: "tikv_block_data_cache_hit", labels: []string{"instance"}},
		{name: "tikv_block_bloom_prefix_cache_hit", tbl: "tikv_block_bloom_prefix_cache_hit", labels: []string{"instance"}},
	}

	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "cache_hit",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2, 3, 4},
		Column:         []string{"METRIC_NAME", "INSTANCE", "AVG", "MAX", "MIN"},
	}
	rows, err := getAvgValueTableData(tables, startTime, endTime, db)
	if err != nil {
		return table, err
	}
	specialHandle := func(row []string) []string {
		if len(row) < 5 {
			return row
		}
		for i := 2; i < 5; i++ {
			f, err := strconv.ParseFloat(row[i], 64)
			if err != nil {
				return row
			}
			row[i] = convertFloatToString(f*100) + "%"
		}
		return row
	}
	for i := range rows {
		rows[i].Values = specialHandle(rows[i].Values)
		for j := range rows[i].SubValues {
			rows[i].SubValues[j] = specialHandle(rows[i].SubValues[j])
		}
	}
	table.Rows = rows
	return table, nil
}

type hardWare struct {
	instance string
	Type     map[string]int
	cpu      map[string]int
	memory   float64
	disk     map[string]float64
	uptime   string
}

func GetClusterHardwareInfoTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	resultRows := make([]TableRowDef, 0, 1)
	table := TableDef{
		Category: []string{CategoryHeader},
		Title:    "cluster_hardware",
		Comment:  "",
		Column:   []string{"HOST", "INSTANCE", "CPU_CORES", "MEMORY (GB)", "DISK (GB)", "UPTIME (DAY)"},
	}
	sql := `SELECT instance,type,NAME,VALUE
		FROM information_schema.CLUSTER_HARDWARE
		WHERE device_type='cpu'
		group by instance,type,VALUE,NAME HAVING NAME = 'cpu-physical-cores'
		OR NAME = 'cpu-logical-cores' ORDER BY INSTANCE`
	rows, err := querySQL(db, sql)
	if err != nil {
		return table, err
	}
	m := make(map[string]*hardWare)
	var s string
	for _, row := range rows {
		idx := strings.Index(row[0], ":")
		s := row[0][:idx]
		cpuCnt, err := strconv.Atoi(row[3])
		if err != nil {
			return table, err
		}
		_, ok := m[s]
		if !ok {
			m[s] = &hardWare{s, map[string]int{row[1]: 1}, make(map[string]int), 0, make(map[string]float64), ""}
		}
		m[s].Type[row[1]]++
		if _, ok := m[s].cpu[row[2]]; !ok {
			m[s].cpu[row[2]] = cpuCnt
		}
	}
	sql = "SELECT instance,value FROM information_schema.CLUSTER_HARDWARE WHERE device_type='memory' and name = 'capacity' group by instance,value"
	rows, err = querySQL(db, sql)
	if err != nil {
		return table, err
	}
	for _, row := range rows {
		s = row[0][:strings.Index(row[0], ":")]
		memCnt, err := strconv.ParseFloat(row[1], 64)
		if err != nil {
			return table, err
		}
		m[s].memory = memCnt
	}
	sql = "SELECT `INSTANCE`,`DEVICE_NAME`,`VALUE` from information_schema.CLUSTER_HARDWARE where `NAME` = 'total' AND `DEVICE_TYPE` = 'disk' AND `DEVICE_NAME` NOT LIKE '%loop%' group by instance,device_name,value"
	rows, err = querySQL(db, sql)
	if err != nil {
		return table, err
	}
	for _, row := range rows {
		s = row[0][:strings.Index(row[0], ":")]
		diskCnt, err := strconv.ParseFloat(row[2], 64)
		if err != nil {
			return table, err
		}
		if _, ok := m[s].disk[row[1]]; !ok {
			m[s].disk[row[1]] = diskCnt
		}
	}

	sql = `SELECT instance,max(value)/60/60/24
	FROM metrics_schema.node_uptime
	where time >= '%[1]s' and time < '%[2]s'
	GROUP BY instance`
	sql = fmt.Sprintf(sql, startTime, endTime)
	rows, err = querySQL(db, sql)
	if err != nil {
		return table, err
	}

	for _, row := range rows {
		s = row[0][:strings.Index(row[0], ":")]
		if _, ok := m[s]; ok {
			m[s].uptime = row[1]
		} else {
			m[s] = &hardWare{s, make(map[string]int), nil, 0, make(map[string]float64), ""}
		}
	}
	rows = rows[:0]
	for _, v := range m {
		row := make([]string, 6)
		row[0] = v.instance
		for k, va := range v.Type {
			row[1] += fmt.Sprintf("%[1]s*%[2]s ", k, strconv.Itoa(va/2))
		}
		row[2] = strconv.Itoa(v.cpu["cpu-physical-cores"]) + "/" + strconv.Itoa(v.cpu["cpu-logical-cores"])
		row[3] = fmt.Sprintf("%f", v.memory/(1024*1024*1024))
		for k, va := range v.disk {
			row[4] += fmt.Sprintf("%[1]s: %[2]f    ", k, va/(1024*1024*1024))
		}
		row[5] = v.uptime
		rows = append(rows, row)
	}
	for _, row := range rows {
		resultRows = append(resultRows, NewTableRowDef(row, nil))
	}
	table.Rows = resultRows
	return table, nil
}

func GetTiKVRocksDBTimeConsumeTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs := []struct {
		name       string
		maxTbl     string
		tbl        string
		conditions []string
		comment    string
	}{
		{
			name:       "get duration",
			maxTbl:     "tikv_engine_max_get_duration",
			tbl:        "tikv_engine_avg_get_duration",
			conditions: []string{"type='get_average'", "type='get_max'", "type='get_percentile99'", "type='get_percentile95'"},
			comment:    "The time consumed when rocksdb executing get operations",
		},
		{
			name:       "seek duration",
			maxTbl:     "tikv_engine_max_seek_duration",
			tbl:        "tikv_engine_avg_seek_duration",
			conditions: []string{"type='seek_average'", "type='seek_max'", "type='seek_percentile99'", "type='seek_percentile95'"},
			comment:    "The time consumed when rocksdb executing seek operations",
		},
		{
			name:       "write duration",
			maxTbl:     "tikv_engine_write_duration",
			tbl:        "tikv_engine_write_duration",
			conditions: []string{"type='write_average'", "type='write_max'", "type='write_percentile99'", "type='write_percentile95'"},
			comment:    "The time consumed when rocksdb executing write operations",
		},
		{
			name:       "WAL sync duration",
			maxTbl:     "tikv_wal_sync_max_duration",
			tbl:        "tikv_wal_sync_duration",
			conditions: []string{"type='wal_file_sync_average'", "type='wal_file_sync_max'", "type='wal_file_sync_percentile99'", "type='wal_file_sync_percentile95'"},
			comment:    "The time consumed when rocksdb executing WAL sync operations",
		},
		{
			name:       "compaction duration",
			maxTbl:     "tikv_compaction_max_duration",
			tbl:        "tikv_compaction_duration",
			conditions: []string{"type='compaction_time_average'", "type='compaction_time_max'", "type='compaction_time_percentile99'", "type='compaction_time_percentile95'"},
			comment:    "The time consumed when rocksdb executing compaction operations",
		},
		{
			name:       "SST read duration",
			maxTbl:     "tikv_sst_read_max_duration",
			tbl:        "tikv_sst_read_duration",
			conditions: []string{"type='sst_read_micros_average'", "type='sst_read_micros_max'", "type='sst_read_micros_percentile99'", "type='sst_read_micros_percentile95'"},
			comment:    "The time consumed when rocksdb reading SST files",
		},
		{
			name:       "write stall duration",
			maxTbl:     "tikv_write_stall_max_duration",
			tbl:        "tikv_write_stall_avg_duration",
			conditions: []string{"type='write_stall_average'", "type='write_stall_max'", "type='write_stall_percentile99'", "type='write_stall_percentile95'"},
			comment:    "The time which is caused by write stall",
		},
	}
	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "rocksdb_time_consume",
		Comment:        "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2, 3, 4, 5},
		Column:         []string{"METRIC_NAME", "LABEL", "AVG", "MAX", "P99", "P95"},
	}
	timeCondition := fmt.Sprintf("where time >= '%s' and time < '%s' ", startTime, endTime)

	specialHandle := func(row []string) []string {
		if len(row) < 6 {
			return row
		}
		for i := 2; i < 6; i++ {
			row[i] = convertFloatToDuration(row[i], float64(1)/float64(10e5))
		}
		return row
	}

	resultRows := make([]TableRowDef, 0, len(defs))
	for _, def := range defs {
		// get sum rows
		sql := fmt.Sprintf("select '%s', '', t0.*, t1.*,t2.*,t3.* from ", def.name)
		for i := range def.conditions {
			condition := timeCondition
			if len(def.conditions[i]) > 0 {
				condition = condition + " and " + def.conditions[i]
			}
			// avg value
			if i == 0 {
				sql = sql + fmt.Sprintf("(select avg(value) from metrics_schema.%s %s) as t%v ", def.tbl, condition, i)
			} else {
				sql = sql + fmt.Sprintf("join (select max(value) from metrics_schema.%s %s) as t%v ", def.tbl, condition, i)
			}
		}
		rows, err := querySQL(db, sql)
		if err != nil {
			return table, err
		}
		if len(rows) == 0 {
			continue
		}
		sql = fmt.Sprintf("select '%s', t0.instance, t0.value, t1.value,t2.value,t3.value from ", def.name)
		for i := range def.conditions {
			condition := timeCondition
			if len(def.conditions[i]) > 0 {
				condition = condition + " and " + def.conditions[i]
			}
			// avg value
			if i == 0 {
				sql = sql + fmt.Sprintf("(select instance, avg(value) as value from metrics_schema.%s %s group by instance) as t%v ", def.tbl, condition, i)
			} else {
				sql = sql + fmt.Sprintf("join (select instance, max(value) as value from metrics_schema.%s %s group by instance) as t%v ", def.tbl, condition, i)
			}
		}
		sql += " on t0.instance = t1.instance and t1.instance = t2.instance and t2.instance = t3.instance order by t0.value desc"
		subRows, err := querySQL(db, sql)
		if err != nil {
			return table, err
		}
		rows[0] = specialHandle(rows[0])
		for i := range subRows {
			subRows[i] = specialHandle(subRows[i])
		}
		resultRows = append(resultRows, TableRowDef{
			Values:    rows[0],
			SubValues: subRows,
			Comment:   def.comment,
		})
	}
	table.Rows = resultRows
	return table, nil
}

func GetTiDBTopNSlowQuery(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	columns := []string{"query_time", "parse_time", "compile_time", "prewrite_time", "commit_time", "process_time", "wait_time", "backoff_time", "cop_proc_max", "cop_wait_max", "query"}
	sql := fmt.Sprintf("select %s from information_schema.cluster_slow_query where time >= '%s' and time < '%s' order by query_time desc limit 10;",
		strings.Join(columns, ","), startTime, endTime)
	table := TableDef{
		Category: []string{CategoryTiDB},
		Title:    "top_10_slow_query",
		Comment:  "",
		Column:   columns,
	}
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	table.Rows = useSubRowForLongColumnValue(rows, len(table.Column)-1)
	return table, nil
}

func GetTiDBTopNSlowQueryGroupByDigest(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	columns := []string{"*", "query_time", "parse_time", "compile_time", "prewrite_time", "commit_time", "process_time", "wait_time", "backoff_time", "cop_proc_max", "cop_wait_max", "query"}
	for i := range columns {
		switch columns[i] {
		case "*":
			columns[i] = "count(*)"
		case "query":
			columns[i] = "min(query)"
		default:
			columns[i] = "sum(" + columns[i] + ")"
		}
	}
	sql := fmt.Sprintf("select /*+ AGG_TO_COP(), HASH_AGG() */ %s from information_schema.cluster_slow_query where time >= '%s' and time < '%s' group by digest order by sum(query_time) desc limit 10;",
		strings.Join(columns, ","), startTime, endTime)
	table := TableDef{
		Category: []string{CategoryTiDB},
		Title:    "top_10_slow_query_group_by_digest",
		Comment:  "",
		Column:   columns,
	}
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	table.Rows = useSubRowForLongColumnValue(rows, len(table.Column)-1)
	return table, nil
}

func GetTiDBSlowQueryWithDiffPlan(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf("select /*+ AGG_TO_COP(), HASH_AGG() */ digest, min(query) from information_schema.cluster_slow_query where time >= '%s' and time < '%s' group by digest having max(plan_digest) != min(plan_digest);",
		startTime, endTime)
	table := TableDef{
		Category: []string{CategoryTiDB},
		Title:    "slow_query_with_diff_plan",
		Comment:  "",
		Column:   []string{"digest", "query"},
	}
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	table.Rows = useSubRowForLongColumnValue(rows, 1)
	return table, nil
}
