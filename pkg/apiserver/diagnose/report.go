// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package diagnose

import (
	"fmt"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/jinzhu/gorm"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

type TableDef struct {
	Category       []string // The category of the table, such as [TiDB]
	Title          string
	CommentEN      string // English Comment
	CommentCN      string // Chinese comment
	joinColumns    []int
	compareColumns []int
	Column         []string // Column name
	Rows           []TableRowDef
}

type TableRowDef struct {
	Values    []string
	SubValues [][]string // SubValues need fold default.
	ratio     float64
	Comment   string
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

func GetReportTablesForDisplay(startTime, endTime string, db *gorm.DB, sqliteDB *dbstore.DB, reportID uint) []*TableDef {
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
		if lastCategory == "" {
			lastCategory = category
			continue
		}
		if category == lastCategory {
			tbl.Category = []string{""}
		}
	}
	return tables
}

func checkBeforeReport(db *gorm.DB) (errRows []TableRowDef) {
	sql := "select count(distinct value) from information_schema.cluster_config where type='pd' and `key` = 'pd-server.metric-storage' and value != '';"
	rows, err := querySQL(db, sql)
	if err != nil {
		errRows = append(errRows, TableRowDef{
			Values: []string{"check before report", "information_schema.cluster_config", err.Error()},
		})
		return
	}
	if len(rows) == 0 {
		errRows = append(errRows, TableRowDef{
			Values: []string{"check before report", "information_schema.cluster_config", "The PD config `pd-server.metric-storage` was not found"},
		})
		return
	}
	count, err := strconv.Atoi(rows[0][0])
	if err != nil {
		errRows = append(errRows, TableRowDef{
			Values: []string{"check before report", "information_schema.cluster_config", "check the sql result: " + sql + " ,the expect result is 1"},
		})
		return
	}
	command := "you can use this shell command to set the config: `curl -X POST -d '{\"metric-storage\":\"http://{PROMETHEUS_ADDRESS}\"}' http://{PD_ADDRESS}/pd/api/v1/config`, \n" +
		"PROMETHEUS_ADDRESS is the prometheus address, It's used for query metric data; PD_ADDRESS is the HTTP API address of PD server, all PD servers need to set this config. \n" +
		"Here is an example: `curl -X POST -d '{\"metric-storage\":\"http://127.0.0.1:9090\"}' http://127.0.0.1:2379/pd/api/v1/config`"
	if count == 0 {
		errRows = append(errRows, TableRowDef{
			Values: []string{
				"check before report",
				"information_schema.cluster_config",
				"The PD config `pd-server.metric-storage` was not set, \n" + command,
			},
		})
		return
	}
	if count > 1 {
		errRows = append(errRows, TableRowDef{
			Values: []string{
				"check before report",
				"information_schema.cluster_config",
				"The PD config `pd-server.metric-storage` value is different from PD servers, \n" +
					"check the sql result: " + sql + " ,the expect result is 1, \n" + command,
			},
		})
		return
	}

	// Check for query metric.
	sql = "select count(*) from metrics_schema.up;"
	_, err = querySQL(db, sql)
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

func GetReportTables(startTime, endTime string, db *gorm.DB, sqliteDB *dbstore.DB, reportID uint) []*TableDef {
	funcs := []getTableFunc{
		// Header
		GetHeaderTimeTable,
		GetClusterHardwareInfoTable,
		GetClusterInfoTable,

		// Diagnose
		GetDiagnoseReport,

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
		GetTiDBGCConfigInfo,
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

func getTablesParallel(startTime, endTime string, db *gorm.DB, funcs []getTableFunc, sqliteDB *dbstore.DB, reportID uint, progress, totalTableCount *int32) ([]*TableDef, []TableRowDef) {
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

	//get table concurrently
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
func doGetTable(taskChan chan *task, resChan chan *tblAndErr, wg *sync.WaitGroup, startTime, endTime string, db *gorm.DB, sqliteDB *dbstore.DB, reportID uint, progress, totalTableCount *int32) {
	defer wg.Done()
	for task := range taskChan {
		f := task.t
		tbl, err := f(startTime, endTime, db)
		newProgress := atomic.AddInt32(progress, 1)
		tblAndErr := tblAndErr{}
		if err != nil {
			category := strings.Join(tbl.Category, ",")
			tblAndErr.err = &TableRowDef{Values: []string{category, tbl.Title, err.Error()}}
			continue
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

//change the get-Table-func to task
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
		Category:  []string{CategoryError},
		Title:     "Generate Report Error",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"CATEGORY", "TABLE", "ERROR"},
		Rows:      errRows,
	}
}

func GetHeaderTimeTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	return TableDef{
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

func GetDiagnoseReport(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	table := TableDef{
		Category:  []string{CategoryDiagnose},
		Title:     "Diagnose",
		CommentEN: "Automatically diagnose the cluster problem and record the problem in below table.",
		CommentCN: "",
		//joinColumns: []int{0, 1, 2, 3, 6},
		Column: []string{"RULE", "ITEM", "TYPE", "INSTANCE", "VALUE", "REFERENCE", "SEVERITY", "DETAILS"},
	}
	sql := fmt.Sprintf("select /*+ time_range('%s','%s') */ * from information_schema.INSPECTION_RESULT", startTime, endTime)
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetTotalTimeConsumeTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	defs1 := []totalTimeByLabelsTableDef{
		{name: "tidb_query", tbl: "tidb_query", labels: []string{"sql_type"}, comment: "The time cost of sql query"},
		{name: "tidb_get_token(us)", tbl: "tidb_get_token", labels: []string{"instance"}, comment: "The time cost of session getting token to execute sql query"},
		{name: "tidb_parse", tbl: "tidb_parse", labels: []string{"sql_type"}, comment: "The time cost of parse SQL"},
		{name: "tidb_compile", tbl: "tidb_compile", labels: []string{"sql_type"}, comment: "The time cost of building the query plan"},
		{name: "tidb_execute", tbl: "tidb_execute", labels: []string{"sql_type"}, comment: "The time cost of executing the SQL which does not include the time to get the results of the query"},
		{name: "tidb_distsql_execution", tbl: "tidb_distsql_execution", labels: []string{"type"}, comment: "The time cost of distsql execution"},
		{name: "tidb_cop", tbl: "tidb_cop", labels: []string{"instance"}, comment: "The time cost of kv storage coprocessor processing"},
		{name: "tidb_transaction", tbl: "tidb_transaction", labels: []string{"sql_type"}, comment: "The time cost of transaction execution durations, including retry"},
		{name: "tidb_transaction_local_latch_wait", tbl: "tidb_transaction_local_latch_wait", labels: []string{"instance"}, comment: "The time cost of "},
		{name: "tidb_kv_backoff", tbl: "tidb_kv_backoff", labels: []string{"type"}, comment: "The time cost of TiDB transaction latch wait time on key value storage"},
		{name: "tidb_kv_request", tbl: "tidb_kv_request", labels: []string{"type"}, comment: "The time cost of kv requests durations"},
		{name: "tidb_slow_query", tbl: "tidb_slow_query", labels: []string{"instance"}, comment: "The time cost of TiDB slow query"},
		{name: "tidb_slow_query_cop_process", tbl: "tidb_slow_query_cop_process", labels: []string{"instance"}, comment: "The time cost of TiDB slow query total cop process time"},
		{name: "tidb_slow_query_cop_wait", tbl: "tidb_slow_query_cop_wait", labels: []string{"instance"}, comment: "The time cost of TiDB slow query total cop wait time"},
		{name: "tidb_ddl_handle_job", tbl: "tidb_ddl", labels: []string{"type"}, comment: "The time cost of handle TiDB DDL job"},
		{name: "tidb_ddl_worker", tbl: "tidb_ddl_worker", labels: []string{"action"}, comment: "The time cost of DDL worker handle job"},
		{name: "tidb_ddl_update_self_version", tbl: "tidb_ddl_update_self_version", labels: []string{"result"}, comment: "The time cost of TiDB schema syncer version update"},
		{name: "tidb_owner_handle_syncer", tbl: "tidb_owner_handle_syncer", labels: []string{"type"}, comment: "The time cost of TiDB DDL owner operations on etcd"},
		{name: "tidb_ddl_batch_add_index", tbl: "tidb_ddl_batch_add_index", labels: []string{"type"}, comment: "The time cost of TiDB batch add index"},
		{name: "tidb_ddl_deploy_syncer", tbl: "tidb_ddl_deploy_syncer", labels: []string{"type"}, comment: "The time cost of TiDB ddl schema syncer statistics, including init, start, watch, clear"},
		{name: "tidb_load_schema", tbl: "tidb_load_schema", labels: []string{"instance"}, comment: "The time cost of TiDB loading schema"},
		{name: "tidb_meta_operation", tbl: "tidb_meta_operation", labels: []string{"type"}, comment: "The time cost of TiDB meta operations, including get/set schema and ddl jobs"},
		{name: "tidb_auto_id_request", tbl: "tidb_auto_id_request", labels: []string{"type"}, comment: "The time cost of TiDB auto id, handle id requests"},
		{name: "tidb_statistics_auto_analyze", tbl: "tidb_statistics_auto_analyze", labels: []string{"instance"}, comment: "The time cost of TiDB auto analyze"},
		{name: "tidb_gc", tbl: "tidb_gc", labels: []string{"instance"}, comment: "The time cost of kv storage garbage collection"},
		{name: "tidb_gc_push_task", tbl: "tidb_gc_push_task", labels: []string{"type"}, comment: "The time cost of kv storage range worker processing one task"},
		{name: "tidb_batch_client_unavailable", tbl: "tidb_batch_client_unavailable", labels: []string{"instance"}, comment: "The time cost of kv storage batch processing unvailable"},
		{name: "tidb_batch_client_wait", tbl: "tidb_batch_client_wait", labels: []string{"instance"}, comment: "The time cost of TiDB kv storage batch client wait request batch"},
		// PD
		{name: "pd_start_tso_wait", tbl: "pd_start_tso_wait", labels: []string{"instance"}, comment: "The time cost of waiting for getting the start timestamp oracle"},
		{name: "pd_tso_rpc", tbl: "pd_tso_rpc", labels: []string{"instance"}, comment: "The time cost of sending TSO request until received the response"},
		{name: "pd_tso_wait", tbl: "pd_tso_wait", labels: []string{"instance"}, comment: "The time cost of client starting to wait for the TS until received the TS result"},
		{name: "pd_client_cmd", tbl: "pd_client_cmd", labels: []string{"type"}, comment: "The time cost of pd client command"},
		{name: "pd_handle_request", tbl: "pd_handle_request", labels: []string{"type"}, comment: "The time cost of pd handle request"},
		{name: "pd_grpc_completed_commands", tbl: "pd_grpc_completed_commands", labels: []string{"grpc_method"}, comment: "The time cost of PD completing each kind of gRPC commands"},
		{name: "pd_operator_finish", tbl: "pd_operator_finish", labels: []string{"type"}, comment: "The time cost of operator is finished"},
		{name: "pd_operator_step_finish", tbl: "pd_operator_step_finish", labels: []string{"type"}, comment: "The time cost of the operator step is finished"},
		{name: "pd_handle_transactions", tbl: "pd_handle_transactions", labels: []string{"result"}, comment: "The time cost of PD handling etcd transactions"},
		{name: "pd_region_heartbeat", tbl: "pd_region_heartbeat", labels: []string{"address"}, comment: "The time cost of heartbeat that each TiKV instance in"},
		{name: "etcd_wal_fsync", tbl: "etcd_wal_fsync", labels: []string{"instance"}, comment: "The time cost of etcd writing WAL into the persistent storage"},
		{name: "pd_peer_round_trip", tbl: "pd_peer_round_trip", labels: []string{"To"}, comment: "The latency of the network"},
		// TiKV
		{name: "tikv_grpc_messge", tbl: "tikv_grpc_messge", labels: []string{"type"}, comment: "The time cost of TiKV handle of gRPC message"},
		{name: "tikv_cop_request", tbl: "tikv_cop_request", labels: []string{"req"}, comment: "The time cost of coprocessor handle read requests"},
		{name: "tikv_cop_handle", tbl: "tikv_cop_handle", labels: []string{"req"}, comment: "The time cost of handling coprocessor requests"},
		{name: "tikv_cop_wait", tbl: "tikv_cop_wait", labels: []string{"req"}, comment: "The time cost of coprocessor requests that wait for being handled"},
		{name: "tikv_scheduler_command", tbl: "tikv_scheduler_command", labels: []string{"type"}, comment: "The time cost of executing commit command"},
		{name: "tikv_scheduler_latch_wait", tbl: "tikv_scheduler_latch_wait", labels: []string{"type"}, comment: "The time cost of TiKV latch wait in commit command"},
		{name: "tikv_handle_snapshot", tbl: "tikv_handle_snapshot", labels: []string{"type"}, comment: "The time cost of handling snapshots"},
		{name: "tikv_send_snapshot", tbl: "tikv_send_snapshot", labels: []string{"instance"}, comment: "The time cost of sending snapshots"},
		{name: "tikv_storage_async_request", tbl: "tikv_storage_async_request", labels: []string{"type"}, comment: "The time cost of processing asynchronous snapshot requests"},
		{name: "tikv_raft_append_log", tbl: "tikv_append_log", labels: []string{"instance"}, comment: "The time cost of Raft appends log"},
		{name: "tikv_raft_apply_log", tbl: "tikv_apply_log", labels: []string{"instance"}, comment: "The time cost of Raft apply log"},
		{name: "tikv_raft_apply_wait", tbl: "tikv_apply_wait", labels: []string{"instance"}, comment: "The time cost of Raft apply wait"},
		{name: "tikv_raft_process", tbl: "tikv_process", labels: []string{"type"}, comment: "The time cost of peer processes in Raft"},
		{name: "tikv_raft_propose_wait", tbl: "tikv_propose_wait", labels: []string{"instance"}, comment: "The wait time of each proposal"},
		{name: "tikv_raft_store_events", tbl: "tikv_raft_store_events", labels: []string{"type"}, comment: "The time cost of raftstore events"},
		{name: "tikv_commit_log", tbl: "tikv_commit_log", labels: []string{"instance"}, comment: "The time cost of Raft commits log"},
		{name: "tikv_check_split", tbl: "tikv_check_split", labels: []string{"instance"}, comment: "The time cost of running split check"},
		{name: "tikv_ingest_sst", tbl: "tikv_ingest_sst", labels: []string{"instance"}, comment: "The time cost of ingesting SST files"},
		{name: "tikv_gc_tasks", tbl: "tikv_gc_tasks", labels: []string{"task"}, comment: "The time cost of executing GC tasks"},
		{name: "tikv_pd_request", tbl: "tikv_pd_request", labels: []string{"type"}, comment: "The time cost of TiKV sends requests to PD"},
		{name: "tikv_lock_manager_deadlock_detect", tbl: "tikv_lock_manager_deadlock_detect", labels: []string{"instance"}, comment: "The time cost of deadlock detect"},
		{name: "tikv_lock_manager_waiter_lifetime", tbl: "tikv_lock_manager_waiter_lifetime", labels: []string{"instance"}},
		{name: "tikv_backup_range", tbl: "tikv_backup_range", labels: []string{"type"}},
		{name: "tikv_backup", tbl: "tikv_backup", labels: []string{"instance"}},
	}

	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	table := TableDef{
		Category: []string{CategoryOverview},
		Title:    "Time Consume",
		CommentEN: `The table contain the event time consume in TiDB/TiKV/PD. 
METRIC_NAME is the event name; 
LABEL is the event label, such as instance, event type ...; 
TIME_RATIO is the TOTAL_TIME of this event devide by the TOTAL_TIME of upper event which TIME_RATIO is 1; 
TOTAL_TIME is the total time cost of this event; 
TOTAL_COUNT is the total count of this event; 
P999 is the max time of 0.999 quantile; 
P99 is the max time of 0.99 quantile; 
P90 is the max time of 0.90 quantile; 
P80 is the max time of 0.80 quantile; 
`,
		joinColumns:    []int{0, 1},
		compareColumns: []int{3, 4, 5},
		CommentCN:      "",
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
		{tbl: "tidb_binlog_error_total_count", labels: []string{"instance"}, comment: "The total count of TiDB write binlog error and skip binlog"},
		{tbl: "tidb_handshake_error_total_count", labels: []string{"instance"}, comment: "The total count of TiDB processing handshake error"},
		{tbl: "tidb_transaction_retry_error_total_count", labels: []string{"sql_type"}, comment: "The total count of transaction retry"},
		{tbl: "tidb_kv_region_error_total_count", labels: []string{"type"}, comment: "The total count of kv region error"},
		{tbl: "tidb_schema_lease_error_total_count", labels: []string{"instance"}, comment: "The total count of TiDB schema lease error"},
		{tbl: "tikv_grpc_error_total_count", labels: []string{"type"}, comment: "The total count of the gRPC message failures"},
		{tbl: "tikv_critical_error_total_count", labels: []string{"type"}, comment: "The total count of the TiKV critical error"},
		{tbl: "tikv_scheduler_is_busy_total_count", labels: []string{"type"}, comment: "The total count of Scheduler Busy events that make the TiKV instance unavailable temporarily"},
		{tbl: "tikv_channel_full_total_count", labels: []string{"type"}, comment: "The total number of channel full errors, it will make the TiKV instance unavailable temporarily"},
		{tbl: "tikv_coprocessor_request_error_total_count", labels: []string{"reason"}, comment: "The total count of coprocessor errors"},
		{tbl: "tikv_engine_write_stall", labels: []string{"instance"}, comment: "Indicates occurrences of Write Stall events that make the TiKV instance unavailable temporarily"},
		{tbl: "tikv_server_report_failures_total_count", labels: []string{"instance"}, comment: "The total count of reported failure messages"},
		{name: "tikv_storage_async_request_error", tbl: "tikv_storage_async_requests_total_count", labels: []string{"type"}, condition: "status not in ('all','success')", comment: "The total number of storage request error"},
		{tbl: "tikv_lock_manager_detect_error_total_count", labels: []string{"type"}, comment: "The total count TiKV lock manager detect error"},
		{tbl: "tikv_backup_errors_total_count", labels: []string{"error"}},
		{tbl: "node_network_in_errors_total_count", labels: []string{"instance"}},
		{tbl: "node_network_out_errors_total_count", labels: []string{"instance"}},
	}

	table := TableDef{
		Category: []string{CategoryOverview},
		Title:    "Error",
		CommentEN: `The table contain the total count of error event. 
METRIC_NAME is the error event name; 
LABEL is the event label, such as instance, event type ...; 
TOTAL_COUNT is the total count of this event; 
`,
		CommentCN:      "",
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
		{name: "tidb_query", tbl: "tidb_query", labels: []string{"instance", "sql_type"}, comment: "The time cost of sql query"},
		{name: "tidb_get_token(us)", tbl: "tidb_get_token", labels: []string{"instance"}, comment: "The time cost of session getting token to execute sql query"},
		{name: "tidb_parse", tbl: "tidb_parse", labels: []string{"instance", "sql_type"}, comment: "The time cost of parse SQL"},
		{name: "tidb_compile", tbl: "tidb_compile", labels: []string{"instance", "sql_type"}, comment: "The time cost of building the query plan"},
		{name: "tidb_execute", tbl: "tidb_execute", labels: []string{"instance", "sql_type"}, comment: "The time cost of executing the SQL which does not include the time to get the results of the query"},
		{name: "tidb_distsql_execution", tbl: "tidb_distsql_execution", labels: []string{"instance", "type"}, comment: "The time cost of distsql execution"},
		{name: "tidb_cop", tbl: "tidb_cop", labels: []string{"instance"}, comment: "The time cost of kv storage coprocessor processing"},
		{name: "tidb_transaction", tbl: "tidb_transaction", labels: []string{"instance", "sql_type", "type"}, comment: "The time cost of transaction execution durations, including retry"},
		{name: "tidb_transaction_local_latch_wait", tbl: "tidb_transaction_local_latch_wait", labels: []string{"instance"}, comment: "The time cost of "},
		{name: "tidb_kv_backoff", tbl: "tidb_kv_backoff", labels: []string{"instance", "type"}, comment: "The time cost of TiDB transaction latch wait time on key value storage"},
		{name: "tidb_kv_request", tbl: "tidb_kv_request", labels: []string{"instance", "store", "type"}, comment: "The time cost of kv requests durations"},
		{name: "tidb_slow_query", tbl: "tidb_slow_query", labels: []string{"instance"}, comment: "The time cost of TiDB slow query"},
		{name: "tidb_slow_query_cop_process", tbl: "tidb_slow_query_cop_process", labels: []string{"instance"}, comment: "The time cost of TiDB slow query total cop process time"},
		{name: "tidb_slow_query_cop_wait", tbl: "tidb_slow_query_cop_wait", labels: []string{"instance"}, comment: "The time cost of TiDB slow query total cop wait time"},
		{name: "tidb_ddl_handle_job", tbl: "tidb_ddl", labels: []string{"instance", "type"}, comment: "The time cost of handle TiDB DDL job"},
		{name: "tidb_ddl_worker", tbl: "tidb_ddl_worker", labels: []string{"instance", "type", "result", "action"}, comment: "The time cost of DDL worker handle job"},
		{name: "tidb_ddl_update_self_version", tbl: "tidb_ddl_update_self_version", labels: []string{"instance", "result"}, comment: "The time cost of TiDB schema syncer version update"},
		{name: "tidb_owner_handle_syncer", tbl: "tidb_owner_handle_syncer", labels: []string{"instance", "type", "result"}, comment: "The time cost of TiDB DDL owner operations on etcd"},
		{name: "tidb_ddl_batch_add_index", tbl: "tidb_ddl_batch_add_index", labels: []string{"instance", "type"}, comment: "The time cost of TiDB batch add index"},
		{name: "tidb_ddl_deploy_syncer", tbl: "tidb_ddl_deploy_syncer", labels: []string{"instance", "type", "result"}, comment: "The time cost of TiDB ddl schema syncer statistics, including init, start, watch, clear"},
		{name: "tidb_load_schema", tbl: "tidb_load_schema", labels: []string{"instance"}, comment: "The time cost of TiDB loading schema"},
		{name: "tidb_meta_operation", tbl: "tidb_meta_operation", labels: []string{"instance", "type", "result"}, comment: "The time cost of TiDB meta operations, including get/set schema and ddl jobs"},
		{name: "tidb_auto_id_request", tbl: "tidb_auto_id_request", labels: []string{"instance", "type"}, comment: "The time cost of TiDB auto id, handle id requests"},
		{name: "tidb_statistics_auto_analyze", tbl: "tidb_statistics_auto_analyze", labels: []string{"instance"}, comment: "The time cost of TiDB auto analyze"},
		{name: "tidb_gc", tbl: "tidb_gc", labels: []string{"instance"}, comment: "The time cost of kv storage garbage collection"},
		{name: "tidb_gc_push_task", tbl: "tidb_gc_push_task", labels: []string{"instance", "type"}, comment: "The time cost of kv storage range worker processing one task"},
		{name: "tidb_batch_client_unavailable", tbl: "tidb_batch_client_unavailable", labels: []string{"instance"}, comment: "The time cost of kv storage batch processing unvailable"},
		{name: "tidb_batch_client_wait", tbl: "tidb_batch_client_wait", labels: []string{"instance"}, comment: "The time cost of TiDB kv storage batch client wait request batch"},
	}

	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	table := TableDef{
		Category: []string{CategoryTiDB},
		Title:    "Time Consume",
		CommentEN: `The table contain the event time consume in TiDB. 
METRIC_NAME is the event name; 
LABEL is the event label, such as instance, event type ...; 
TIME_RATIO is the TOTAL_TIME of this event devide by the TOTAL_TIME of upper event which TIME_RATIO is 1; 
TOTAL_TIME is the total time cost of this event; 
TOTAL_COUNT is the total count of this event; 
P999 is the max time of 0.999 quantile; 
P99 is the max time of 0.99 quantile; 
P90 is the max time of 0.90 quantile; 
P80 is the max time of 0.80 quantile; 
`,
		CommentCN:      "",
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
		{name: "tidb_transaction_retry_num", tbl: "tidb_transaction_retry_num", sumTbl: "tidb_transaction_retry_total_num", countTbl: "tidb_transaction_retry_num_total_count", labels: []string{"instance"}, comment: "TiDB transaction retry num"},
		{name: "tidb_transaction_statement_num", tbl: "tidb_transaction_statement_num", sumTbl: "tidb_transaction_statement_total_num", countTbl: "tidb_transaction_statement_num_total_count", labels: []string{"sql_type"}, comment: "The total count of TiDB statements numbers within one transaction. Internal means TiDB inner transaction"},
		{name: "tidb_txn_region_num", tbl: "tidb_txn_region_num", sumTbl: "tidb_txn_region_total_num", countTbl: "tidb_txn_region_num_total_count", labels: []string{"instance"}, comment: "the count of regions operates per transaction execution"},
		{name: "tidb_txn_kv_write_num", tbl: "tidb_kv_write_num", sumTbl: "tidb_kv_write_total_num", countTbl: "tidb_kv_write_num_total_count", labels: []string{"instance"}, comment: " kv write number per transaction execution"},
		{name: "tidb_txn_kv_write_size", tbl: "tidb_kv_write_size", sumTbl: "tidb_kv_write_total_size", countTbl: "tidb_kv_write_size_total_count", labels: []string{"instance"}, comment: "kv write size per transaction execution"},
	}
	defs2 := []sumValueQuery{
		{name: "tidb_load_safepoint_total_num", tbl: "tidb_load_safepoint_total_num", labels: []string{"type"}, comment: "The total count of safe point loading"},
		{name: "tidb_lock_resolver_total_num", tbl: "tidb_lock_resolver_total_num", labels: []string{"type"}, comment: "The total number of lock resolve"},
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
		Category: []string{CategoryTiDB},
		Title:    "Transaction",
		CommentEN: `The table contain the TiDB transaction statistics information. 
METRIC_NAME is the object name; 
LABEL is the object label, such as instance, event type ...; 
TOTAL_VALUE is the total size/value of this object; 
TOTAL_COUNT is the total count of this object; 
P999 is the max size/value of 0.999 quantile; 
P99 is the max size/value of 0.99 quantile; 
P90 is the max size/value of 0.90 quantile; 
P80 is the max size/value of 0.80 quantile; 
`,
		CommentCN:      "",
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
		Title:          "TiDB Connection count",
		CommentEN:      "The connection count of tidb server",
		CommentCN:      "",
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
		{name: "pseudo_estimation_total_count", tbl: "tidb_statistics_pseudo_estimation_total_count", labels: []string{"instance"}, comment: "The total count of TiDB optimizer using pseudo estimation"},
		{name: "dump_feedback_total_count", tbl: "tidb_statistics_dump_feedback_total_count", labels: []string{"instance", "type"}, comment: "The total count of operations that TiDB dumping statistics back to kv storage"},
		{name: "store_query_feedback_total_count", tbl: "tidb_statistics_store_query_feedback_total_count", labels: []string{"instance", "type"}, comment: "The total count of TiDB store quering feedback"},
		{name: "update_stats_total_count", tbl: "tidb_statistics_update_stats_total_count", labels: []string{"instance", "type"}, comment: "The total count of TiDB updating statistics using feed back"},
	}

	table := TableDef{
		Category:       []string{CategoryTiDB},
		Title:          "Statistics Info",
		CommentEN:      "",
		CommentCN:      "",
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
		Title:       "DDL-owner",
		CommentEN:   "DDL Owner info. Attention, if no DDL request has been executed, below owner info maybe null, it doesn't indicate no DDL owner exists.",
		CommentCN:   "",
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

func GetPDConfigInfo(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf(`select t1.*,t2.count from
		(select min(time) as time,type,value from metrics_schema.pd_scheduler_config where time>='%[1]s' and time<'%[2]s' group by type,value order by type) as t1 join
		(select type, count(distinct value) as count from metrics_schema.pd_scheduler_config where time>='%[1]s' and time<'%[2]s' group by type order by count desc) as t2 
		where t1.type=t2.type order by t2.count desc, t1.time;`, startTime, endTime)

	table := TableDef{
		Category:       []string{CategoryConfig},
		Title:          "Scheduler Config",
		CommentEN:      "PD scheduler config change history. MIN_TIME is the minimum start effective time",
		CommentCN:      "",
		joinColumns:    []int{1},
		compareColumns: []int{2},
		Column:         []string{"MIN_TIME", "CONFIG_ITEM", "VALUE", "CHANGE_COUNT"},
	}
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetTiDBGCConfigInfo(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf(`select t1.*,t2.count from
		(select min(time) as time,type,value from metrics_schema.tidb_gc_config where time>='%[1]s' and time<'%[2]s' and value > 0 group by type,value order by type) as t1 join
		(select type, count(distinct value) as count from metrics_schema.tidb_gc_config where time>='%[1]s' and time<'%[2]s' and value > 0 group by type order by count desc) as t2 
		where t1.type=t2.type order by t2.count desc, t1.time;`, startTime, endTime)

	table := TableDef{
		Category: []string{CategoryConfig},
		Title:    "TiDB GC Config",
		CommentEN: `TiDB GC config change history; 
MIN_TIME is the minimum start effective time`,
		CommentCN:      "",
		joinColumns:    []int{1},
		compareColumns: []int{2},
		Column:         []string{"MIN_TIME", "CONFIG_ITEM", "VALUE", "CHANGE_COUNT"},
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
		{name: "pd_client_cmd", tbl: "pd_client_cmd", labels: []string{"instance", "type"}, comment: "The time cost of pd client command"},
		{name: "pd_handle_request", tbl: "pd_handle_request", labels: []string{"instance", "type"}, comment: "The time cost of pd handle request"},
		{name: "pd_grpc_completed_commands", tbl: "pd_grpc_completed_commands", labels: []string{"instance", "grpc_method"}, comment: "The time cost of PD completing each kind of gRPC commands"},
		{name: "pd_operator_finish", tbl: "pd_operator_finish", labels: []string{"type"}, comment: "The time cost of operator is finished"},
		{name: "pd_operator_step_finish", tbl: "pd_operator_step_finish", labels: []string{"type"}, comment: "The time cost of the operator step is finished"},
		{name: "pd_handle_transactions", tbl: "pd_handle_transactions", labels: []string{"instance", "result"}, comment: "The time cost of PD handling etcd transactions"},
		{name: "pd_region_heartbeat", tbl: "pd_region_heartbeat", labels: []string{"address", "store"}, comment: "The time cost of heartbeat that each TiKV instance in"},
		{name: "etcd_wal_fsync", tbl: "etcd_wal_fsync", labels: []string{"instance"}, comment: "The time cost of etcd writing WAL into the persistent storage"},
		{name: "pd_peer_round_trip", tbl: "pd_peer_round_trip", labels: []string{"instance", "To"}, comment: "The latency of the network"},
	}

	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	table := TableDef{
		Category: []string{CategoryPD},
		Title:    "Time Consume",
		CommentEN: `The table contain the event time consume in PD. 
METRIC_NAME is the event name; 
LABEL is the event label, such as instance, event type ...; 
TIME_RATIO is the TOTAL_TIME of this event devide by the TOTAL_TIME of upper event which TIME_RATIO is 1; 
TOTAL_TIME is the total time cost of this event; 
TOTAL_COUNT is the total count of this event; 
P999 is the max time of 0.999 quantile; 
P99 is the max time of 0.99 quantile; 
P90 is the max time of 0.90 quantile; 
P80 is the max time of 0.80 quantile; 
`,
		CommentCN:      "",
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
		{name: "blance-leader-in", tbl: "pd_scheduler_balance_leader", condition: "type='move-leader' and address like '%-in'", labels: []string{"address"}, comment: "blance-leader-in is the total count of leader move into the tikv store"},
		{name: "blance-leader-out", tbl: "pd_scheduler_balance_leader", condition: "type='move-leader' and address like '%-out'", labels: []string{"address"}, comment: "blance-leader-out is the total count of leader move out the tikv store"},
		{name: "blance-region-in", tbl: "pd_scheduler_balance_region", condition: "type='move-peer' and address like '%-in'", labels: []string{"address"}, comment: "blance-region-in is the total count of region move into the tikv store"},
		{name: "blance-region-out", tbl: "pd_scheduler_balance_region", condition: "type='move-peer' and address like '%-out'", labels: []string{"address"}, comment: "blance-region-in is the total count of region move into the tikv store"},
	}

	table := TableDef{
		Category:       []string{CategoryPD},
		Title:          "blance leader/region",
		CommentEN:      "",
		CommentCN:      "",
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
		{name: "Approximate Region size", tbl: "tikv_approximate_region_size", sumTbl: "tikv_approximate_region_total_size", countTbl: "tikv_approximate_region_size_total_count", labels: []string{"instance"}, comment: "The approximate Region size"},
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
		Title:          "Approximate Region size",
		CommentEN:      "",
		CommentCN:      "",
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
		{name: "store size", tbl: "tikv_engine_size", labels: []string{"instance", "type"}, comment: "The storage size"},
	}
	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "tikv engine size",
		CommentEN:      "The storage size per TiKV instance",
		CommentCN:      "",
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
		{name: "tikv_grpc_messge", tbl: "tikv_grpc_messge", labels: []string{"instance", "type"}, comment: "The time cost of TiKV handle of gRPC message"},
		{name: "tikv_cop_request", tbl: "tikv_cop_request", labels: []string{"instance", "req"}, comment: "The time cost of coprocessor handle read requests"},
		{name: "tikv_cop_handle", tbl: "tikv_cop_handle", labels: []string{"instance", "req"}, comment: "The time cost of handling coprocessor requests"},
		{name: "tikv_cop_wait", tbl: "tikv_cop_wait", labels: []string{"instance", "req"}, comment: "The time cost of coprocessor requests that wait for being handled"},
		{name: "tikv_scheduler_command", tbl: "tikv_scheduler_command", labels: []string{"instance", "type"}, comment: "The time cost of executing commit command"},
		{name: "tikv_scheduler_latch_wait", tbl: "tikv_scheduler_latch_wait", labels: []string{"instance", "type"}, comment: "The time cost of TiKV latch wait in commit command"},
		{name: "tikv_handle_snapshot", tbl: "tikv_handle_snapshot", labels: []string{"instance", "type"}, comment: "The time cost of handling snapshots"},
		{name: "tikv_send_snapshot", tbl: "tikv_send_snapshot", labels: []string{"instance"}, comment: "The time cost of sending snapshots"},
		{name: "tikv_storage_async_request", tbl: "tikv_storage_async_request", labels: []string{"instance", "type"}, comment: "The time cost of processing asynchronous snapshot requests"},
		{name: "tikv_raft_append_log", tbl: "tikv_append_log", labels: []string{"instance"}, comment: "The time cost of Raft appends log"},
		{name: "tikv_raft_apply_log", tbl: "tikv_apply_log", labels: []string{"instance"}, comment: "The time cost of Raft apply log"},
		{name: "tikv_raft_apply_wait", tbl: "tikv_apply_wait", labels: []string{"instance"}, comment: "The time cost of Raft apply wait"},
		{name: "tikv_raft_process", tbl: "tikv_process", labels: []string{"instance", "type"}, comment: "The time cost of peer processes in Raft"},
		{name: "tikv_raft_propose_wait", tbl: "tikv_propose_wait", labels: []string{"instance"}, comment: "The wait time of each proposal"},
		{name: "tikv_raft_store_events", tbl: "tikv_raft_store_events", labels: []string{"instance", "type"}, comment: "The time cost of raftstore events"},
		{name: "tikv_raft_commit_log", tbl: "tikv_commit_log", labels: []string{"instance"}, comment: "The time cost of Raft commits log"},
		{name: "tikv_check_split", tbl: "tikv_check_split", labels: []string{"instance"}, comment: "The time cost of running split check"},
		{name: "tikv_ingest_sst", tbl: "tikv_ingest_sst", labels: []string{"instance"}, comment: "The time cost of ingesting SST files"},
		{name: "tikv_gc_tasks", tbl: "tikv_gc_tasks", labels: []string{"instance", "task"}, comment: "The time cost of executing GC tasks"},
		{name: "tikv_pd_request", tbl: "tikv_pd_request", labels: []string{"instance", "type"}, comment: "The time cost of TiKV sends requests to PD"},
		{name: "tikv_lock_manager_deadlock_detect", tbl: "tikv_lock_manager_deadlock_detect", labels: []string{"instance"}, comment: "The time cost of deadlock detect"},
		{name: "tikv_lock_manager_waiter_lifetime", tbl: "tikv_lock_manager_waiter_lifetime", labels: []string{"instance"}},
		{name: "tikv_backup_range", tbl: "tikv_backup_range", labels: []string{"instance", "type"}},
		{name: "tikv_backup", tbl: "tikv_backup", labels: []string{"instance"}},
	}

	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	table := TableDef{
		Category: []string{CategoryTiKV},
		Title:    "Time Consume",
		CommentEN: `The table contain the event time consume in TiKV. 
METRIC_NAME is the event name; 
LABEL is the event label, such as instance, event type ...; 
TIME_RATIO is the TOTAL_TIME of this event devide by the TOTAL_TIME of upper event which TIME_RATIO is 1; 
TOTAL_TIME is the total time cost of this event; 
TOTAL_COUNT is the total count of this event; 
P999 is the max time of 0.999 quantile; 
P99 is the max time of 0.99 quantile; 
P90 is the max time of 0.90 quantile; 
P80 is the max time of 0.80 quantile; 
`,
		CommentCN:      "",
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
		{name: "tikv_scheduler_keys_read", tbl: "tikv_scheduler_keys_read", sumTbl: "tikv_scheduler_keys_total_read", countTbl: "tikv_scheduler_keys_read_total_count", labels: []string{"instance", "type"}, comment: "The count of keys read by a command"},
		{name: "tikv_scheduler_keys_written", tbl: "tikv_scheduler_keys_written", sumTbl: "tikv_scheduler_keys_total_written", countTbl: "tikv_scheduler_keys_written_total_count", labels: []string{"instance", "type"}, comment: "The count of keys written by a command"},
	}
	defs2 := []sumValueQuery{
		{tbl: "tikv_scheduler_scan_details_total_num", labels: []string{"instance", "req", "tag"}, comment: "The keys scan details of each CF when executing a command"},
		{tbl: "tikv_scheduler_stage_total_num", labels: []string{"instance", "type", "stage"}, comment: "the total number of scheduler state"},
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
		Title:          "Scheduler Info",
		CommentEN:      "",
		CommentCN:      "",
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
		{tbl: "tikv_gc_keys_total_num", labels: []string{"instance", "cf", "tag"}, comment: "The total number of keys in CF affected during GC"},
		{name: "tidb_gc_worker_action_total_num", tbl: "tidb_gc_worker_action_opm", labels: []string{"instance", "type"}, comment: "The total count of kv storage garbage collection"},
	}

	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "GC Info",
		CommentEN:      "",
		CommentCN:      "",
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
		{tbl: "tikv_worker_handled_tasks_total_num", labels: []string{"instance", "name"}, comment: "Total number of tasks handled by worker"},
		{tbl: "tikv_worker_pending_tasks_total_num", labels: []string{"instance", "name"}, comment: "Total number of pending and running tasks of worker"},
		{tbl: "tikv_futurepool_handled_tasks_total_num", labels: []string{"instance", "name"}, comment: "Total number of tasks handled by future_pool"},
		{tbl: "tikv_futurepool_pending_tasks_total_num", labels: []string{"instance", "name"}, comment: "Total pending and running tasks of future_pool"},
	}

	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "Task Info",
		CommentEN:      "",
		CommentCN:      "",
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
		{name: "tikv_snapshot_kv_count", tbl: "tikv_snapshot_kv_count", sumTbl: "tikv_snapshot_kv_total_count", countTbl: "tikv_snapshot_kv_count_total_count", labels: []string{"instance"}, comment: "The count of KV within a snapshot"},
		{name: "tikv_snapshot_size", tbl: "tikv_snapshot_size", sumTbl: "tikv_snapshot_total_size", countTbl: "tikv_snapshot_size_total_count", labels: []string{"instance"}, comment: "The size of snapshot size"},
	}
	defs2 := []sumValueQuery{
		{tbl: "tikv_snapshot_state_total_count", labels: []string{"instance", "type"}, comment: "The total number of snapshots in different states"},
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
		Title:          "Snapshot Info",
		CommentEN:      "",
		CommentCN:      "",
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
		{name: "tikv_cop_scan_keys_num", tbl: "tikv_cop_scan_keys_total_num", labels: []string{"instance", "req"}, comment: "TiKV coprocessor scan keys total count."},
		{tbl: "tikv_cop_total_response_total_size", labels: []string{"instance"}, comment: "TiKV coprocessor response total size"},
		{name: "tikv_cop_scan_num", tbl: "tikv_cop_scan_details_total", labels: []string{"instance", "req", "tag", "cf"}, comment: "TiKV coprocessor scan operations total count"},
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
		Title:          "Coprocessor Info",
		CommentEN:      "",
		CommentCN:      "",
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
		{tbl: "tikv_raft_sent_messages_total_num", labels: []string{"instance", "type"}, comment: "The total number of Raft messages sent"},
		{tbl: "tikv_flush_messages_total_num", labels: []string{"instance"}, comment: "The total number of Raft messages flushed"},
		{tbl: "tikv_receive_messages_total_num", labels: []string{"instance"}, comment: "The total number of Raft messages received"},
		{tbl: "tikv_raft_dropped_messages_total", labels: []string{"instance", "type"}, comment: "The total number of dropped Raft messages"},
		{tbl: "tikv_raft_proposals_total_num", labels: []string{"instance", "type"}, comment: "The total number of raft proposals"},
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
		Title:          "Raft Info",
		CommentEN:      "",
		CommentCN:      "",
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
		{tbl: "tikv_grpc_error_total_count", labels: []string{"instance", "type"}, comment: "The total count of the gRPC message failures"},
		{tbl: "tikv_critical_error_total_count", labels: []string{"instance", "type"}, comment: "The total count of the TiKV critical error"},
		{tbl: "tikv_scheduler_is_busy_total_count", labels: []string{"instance", "db", "type", "stage"}, comment: "The total count of Scheduler Busy events that make the TiKV instance unavailable temporarily"},
		{tbl: "tikv_channel_full_total_count", labels: []string{"instance", "db", "type"}, comment: "The total number of channel full errors, it will make the TiKV instance unavailable temporarily"},
		{tbl: "tikv_coprocessor_request_error_total_count", labels: []string{"instance", "reason"}, comment: "The total count of coprocessor errors"},
		{tbl: "tikv_engine_write_stall", labels: []string{"instance", "db"}, comment: "Indicates occurrences of Write Stall events that make the TiKV instance unavailable temporarily"},
		{tbl: "tikv_server_report_failures_total_count", labels: []string{"instance"}, comment: "The total count of reported failure messages"},
		{name: "tikv_storage_async_request_error", tbl: "tikv_storage_async_requests_total_count", labels: []string{"instance", "status", "type"}, condition: "status not in ('all','success')", comment: "The total number of storage request error"},
		{tbl: "tikv_lock_manager_detect_error_total_count", labels: []string{"instance", "type"}, comment: "The total count TiKV lock manager detect error"},
		{tbl: "tikv_backup_errors_total_count", labels: []string{"instance", "error"}},
	}
	defs := make([]rowQuery, 0, len(defs1))
	for i := range defs1 {
		defs = append(defs, defs1[i])
	}

	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "Error",
		CommentEN:      "",
		CommentCN:      "",
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

func GetTiDBCurrentConfig(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf("select `key`,`value` from information_schema.CLUSTER_CONFIG where type='tidb' group by `key`,`value` order by `key`;")
	table := TableDef{
		Category:  []string{CategoryConfig},
		Title:     "TiDB Current Config",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"KEY", "VALUE"},
	}
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetPDCurrentConfig(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf("select `key`,`value` from information_schema.CLUSTER_CONFIG where type='pd' group by `key`,`value` order by `key`;")
	table := TableDef{
		Category:  []string{CategoryConfig},
		Title:     "PD Current Config",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"KEY", "VALUE"},
	}
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, err
	}
	table.Rows = rows
	return table, nil
}

func GetTiKVCurrentConfig(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf("select `key`,`value` from information_schema.CLUSTER_CONFIG where type='tikv' group by `key`,`value` order by `key`;")
	table := TableDef{
		Category:  []string{CategoryConfig},
		Title:     "TiKV Current Config",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"KEY", "VALUE"},
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
		{name: "node_disk_write_latency", tbl: "node_disk_write_latency", label: "instance", Comment: "the disk write latency in each node(ms)"},
		{name: "node_disk_read_latency", tbl: "node_disk_read_latency", label: "instance", Comment: "the disk read latency in each node(ms)"},
	}
	table := TableDef{
		Category:       []string{CategoryLoad},
		Title:          "Node Load info",
		CommentEN:      "",
		CommentCN:      "",
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
		row[2] = RoundFloatString(row[2]) + "%"
		row[3] = RoundFloatString(row[3]) + "%"
		row[4] = RoundFloatString(row[4]) + "%"
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
		row[2] = RoundFloatString(row[2]) + "%"
		row[3] = RoundFloatString(row[3]) + "%"
		row[4] = RoundFloatString(row[4]) + "%"
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
		Title:          "Process cpu usage",
		CommentEN:      "",
		CommentCN:      "",
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
		Title:          "Process memory usage",
		CommentEN:      "",
		CommentCN:      "",
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
		Title:          "TiDB/PD goroutines count",
		CommentEN:      "The goroutine count of tidb/pd server",
		CommentCN:      "",
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
		{name: "grpc poll", tbl: "tikv_thread_cpu", label: "instance", condition: "name like 'grpc%'", Comment: "The CPU utilization of each TiKV grpc"},
		{name: "raftstore", tbl: "tikv_thread_cpu", label: "instance", condition: "name like 'raftstore_%'", Comment: "The CPU utilization of TiKV raftstore thread"},
		{name: "Async apply", tbl: "tikv_thread_cpu", label: "instance", condition: "name like 'apply%'", Comment: "The CPU utilization of TiKV async apply thread"},
		{name: "sched_worker", tbl: "tikv_thread_cpu", label: "instance", condition: "name like 'sched_%'", Comment: "The CPU utilization of TiKV scheduler worker thread"},
		{name: "snapshot", tbl: "tikv_thread_cpu", label: "instance", condition: "name like 'snap%'", Comment: "The CPU utilization of TiKV snapshot"},
		{name: "unified read pool", tbl: "tikv_thread_cpu", label: "instance", condition: "name like 'unified_read_po%'", Comment: "The CPU utilization TiKV unified read pool thread"},
		{name: "storage read pool", tbl: "tikv_thread_cpu", label: "instance", condition: "name like 'store_read%'", Comment: "The CPU utilization TiKV storage read pool thread"},
		{name: "storage read pool normal", tbl: "tikv_thread_cpu", label: "instance", condition: "name like 'store_read_norm%'", Comment: "The CPU utilization TiKV storage read pool normal thread"},
		{name: "storage read pool high", tbl: "tikv_thread_cpu", label: "instance", condition: "name like 'store_read_high%'", Comment: "The CPU utilization TiKV storage read pool high thread"},
		{name: "storage read pool low", tbl: "tikv_thread_cpu", label: "instance", condition: "name like 'store_read_low%'", Comment: "The CPU utilization TiKV storage read pool low thread"},
		{name: "cop", tbl: "tikv_thread_cpu", label: "instance", condition: "name like 'cop%'", Comment: "The CPU utilization of TiKV coporssesor"},
		{name: "cop normal", tbl: "tikv_thread_cpu", label: "instance", condition: "name like 'cop_normal%'", Comment: "The CPU utilization of TiKV coporssesor normal thread"},
		{name: "cop high", tbl: "tikv_thread_cpu", label: "instance", condition: "name like 'cop_high%'", Comment: "The CPU utilization of TiKV coporssesor high thread"},
		{name: "cop low", tbl: "tikv_thread_cpu", label: "instance", condition: "name like 'cop_low%'", Comment: "The CPU utilization of TiKV coporssesor low thread"},
		{name: "rocksdb", tbl: "tikv_thread_cpu", label: "instance", condition: "name like 'rocksdb%'", Comment: "The CPU utilization TiKV rocksdb"},
		{name: "gc", tbl: "tikv_thread_cpu", label: "instance", condition: "name like 'gc_worker%'", Comment: "The CPU utilization of TiKV gc"},
		{name: "split_check", tbl: "tikv_thread_cpu", label: "instance", condition: "name = 'split_check'", Comment: "The CPU utilization of TiKV split_check"},
	}
	table := TableDef{
		Category:       []string{CategoryLoad},
		Title:          "TiKV Thread CPU Usage",
		CommentEN:      "",
		CommentCN:      "",
		joinColumns:    []int{0, 1},
		compareColumns: []int{2, 3, 4},
		Column:         []string{"METRIC_NAME", "INSTANCE", "AVG", "MAX", "MIN"},
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
		sql := fmt.Sprintf("select '%[1]s', '', avg(sum_value),max(sum_value),min(sum_value) from ( select sum(value) as sum_value from metrics_schema.%[2]s %[3]s group by %[4]s, time) as t1",
			def.name, def.tbl, condition, def.label)
		rows, err := querySQL(db, sql)
		if err != nil {
			return table, err
		}
		if len(rows) == 0 {
			continue
		}
		sql = fmt.Sprintf("select '%[1]s', %[2]s,avg(sum_value),max(sum_value),min(sum_value) from ( select %[2]s,sum(value) as sum_value from metrics_schema.%[3]s %[4]s group by %[2]s,time) as t1 group by %[2]s order by avg(sum_value) desc",
			def.name, def.label, def.tbl, condition)
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
		{name: "region_score", tbl: "pd_scheduler_store_status", condition: "type = 'region_score'", label: "address", Comment: "The region score status of store"},
		{name: "leader_score", tbl: "pd_scheduler_store_status", condition: "type = 'leader_score'", label: "address", Comment: "The leader score status of store"},
		{name: "region_count", tbl: "pd_scheduler_store_status", condition: "type = 'region_count'", label: "address", Comment: "The region count status of store"},
		{name: "leader_count", tbl: "pd_scheduler_store_status", condition: "type = 'leader_count'", label: "address", Comment: "The region score status of store"},
		{name: "region_size", tbl: "pd_scheduler_store_status", condition: "type = 'region_size'", label: "address", Comment: "The region size status of store"},
		{name: "leader_size", tbl: "pd_scheduler_store_status", condition: "type = 'leader_size'", label: "address", Comment: "The leader size status of store"},
	}
	table := TableDef{
		Category:       []string{CategoryPD},
		Title:          "store status",
		CommentEN:      "",
		CommentCN:      "",
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
		Title:          "cluster status",
		CommentEN:      "",
		CommentCN:      "",
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
		Title:          "etcd status",
		CommentEN:      "",
		CommentCN:      "",
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

func GetClusterInfoTable(startTime, endTime string, db *gorm.DB) (TableDef, error) {
	sql := fmt.Sprintf("select * from information_schema.cluster_info")
	table := TableDef{
		Category:    []string{CategoryHeader},
		Title:       "cluster info",
		CommentEN:   "",
		CommentCN:   "",
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
		{name: "tikv_memtable_hit", tbl: "tikv_memtable_hit", label: "instance", Comment: "The hit rate of memtable"},
		{name: "tikv_block_all_cache_hit", tbl: "tikv_block_all_cache_hit", label: "instance", Comment: "The hit rate of all block cache"},
		{name: "tikv_block_index_cache_hit", tbl: "tikv_block_index_cache_hit", label: "instance", Comment: "The hit rate of index block cache"},
		{name: "tikv_block_filter_cache_hit", tbl: "tikv_block_filter_cache_hit", label: "instance", Comment: "The hit rate of filter block cache"},
		{name: "tikv_block_data_cache_hit", tbl: "tikv_block_data_cache_hit", label: "instance", Comment: "The hit rate of data block cache"},
		{name: "tikv_block_bloom_prefix_cache_hit", tbl: "tikv_block_bloom_prefix_cache_hit", label: "instance", Comment: "The hit rate of bloom_prefix block cache"},
	}

	table := TableDef{
		Category:       []string{CategoryTiKV},
		Title:          "cache hit",
		CommentEN:      "",
		CommentCN:      "",
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
		Category:  []string{CategoryHeader},
		Title:     "cluster hardware",
		CommentEN: "The hardwareInfo of each node",
		CommentCN: "",
		Column:    []string{"HOST", "INSTANCE", "CPU_CORES", "MEMORY (GB)", "DISK (GB)", "UPTIME (DAY)"},
	}
	sql := `SELECT instance,type,NAME,VALUE
		FROM information_schema.CLUSTER_HARDWARE
		WHERE device_type='cpu'
		group by instance,type,VALUE,NAME HAVING NAME = 'cpu-physical-cores' 
		OR NAME = 'cpu-logical-cores' ORDER BY INSTANCE `
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
		if _, ok := m[s].Type[row[1]]; ok {
			m[s].Type[row[1]]++
		} else {
			m[s].Type[row[1]] = 1
		}
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
	sql = "SELECT `INSTANCE`,`DEVICE_NAME`,`VALUE` from information_schema.CLUSTER_HARDWARE where `NAME` = 'total' AND `DEVICE_TYPE` = 'disk' AND `DEVICE_NAME` NOT LIKE '/dev/loop%' AND (`DEVICE_NAME` LIKE '/dev%' or `DEVICE_NAME` LIKE 'sda%' or`DEVICE_NAME` LIKE 'nvme%') group by instance,device_name,value"
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
		Title:          "RocksDB Time Consume",
		CommentEN:      "",
		CommentCN:      "",
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
