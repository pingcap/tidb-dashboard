// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package slowquery

import (
	"strings"

	"gorm.io/datatypes"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/reflectutil"
)

type Model struct {
	Digest string `gorm:"column:Digest" json:"digest"`
	Query  string `gorm:"column:Query" json:"query"`

	Instance string `gorm:"column:INSTANCE" json:"instance"`
	DB       string `gorm:"column:DB" json:"db"`
	// TODO: Switch back to uint64 when modern browser as well as Swagger handles BigInt well.
	ConnectionID string `gorm:"column:Conn_ID" json:"connection_id"`
	Success      int    `gorm:"column:Succ" json:"success"`

	Timestamp             float64 `gorm:"column:timestamp" proj:"(UNIX_TIMESTAMP(Time) + 0E0)" json:"timestamp" related:"time"` // finish time
	QueryTime             float64 `gorm:"column:Query_time" json:"query_time"`                                                  // latency
	ParseTime             float64 `gorm:"column:Parse_time" json:"parse_time"`
	CompileTime           float64 `gorm:"column:Compile_time" json:"compile_time"`
	RewriteTime           float64 `gorm:"column:Rewrite_time" json:"rewrite_time"`
	PreprocSubqueriesTime float64 `gorm:"column:Preproc_subqueries_time" json:"preproc_subqueries_time"`
	OptimizeTime          float64 `gorm:"column:Optimize_time" json:"optimize_time"`
	WaitTSTime            float64 `gorm:"column:Wait_TS" json:"wait_ts"`
	CopTime               float64 `gorm:"column:Cop_time" json:"cop_time"`
	LockKeysTime          float64 `gorm:"column:LockKeys_time" json:"lock_keys_time"`
	WriteRespTime         float64 `gorm:"column:Write_sql_response_total" json:"write_sql_response_total"`
	ExecRetryTime         float64 `gorm:"column:Exec_retry_time" json:"exec_retry_time"`

	MemoryMax int `gorm:"column:Mem_max" json:"memory_max"`
	DiskMax   int `gorm:"column:Disk_max" json:"disk_max"`
	// TODO: Switch back to uint64 when modern browser as well as Swagger handles BigInt well.
	TxnStartTS string `gorm:"column:Txn_start_ts" json:"txn_start_ts"`

	// Detail
	PrevStmt   string         `gorm:"column:Prev_stmt" json:"prev_stmt"`
	Plan       string         `gorm:"column:Plan" json:"plan"` // deprecated, replaced by BinaryPlanText
	BinaryPlan string         `gorm:"column:Binary_plan" json:"binary_plan"`
	Warnings   datatypes.JSON `gorm:"column:Warnings" json:"warnings"`

	// Basic
	IsInternal      int    `gorm:"column:Is_internal" json:"is_internal"`
	IndexNames      string `gorm:"column:Index_names" json:"index_names"`
	Stats           string `gorm:"column:Stats" json:"stats"`
	BackoffTypes    string `gorm:"column:Backoff_types" json:"backoff_types"`
	Prepared        int    `gorm:"column:Prepared" json:"prepared"`
	PlanFromCache   int    `gorm:"column:Plan_from_cache" json:"plan_from_cache"`
	PlanFromBinding int    `gorm:"column:Plan_from_binding" json:"plan_from_binding"`

	// Connection
	User string `gorm:"column:User" json:"user"`
	Host string `gorm:"column:Host" json:"host"`

	// Time
	ProcessTime            float64 `gorm:"column:Process_time" json:"process_time"`
	WaitTime               float64 `gorm:"column:Wait_time" json:"wait_time"`
	BackoffTime            float64 `gorm:"column:Backoff_time" json:"backoff_time"`
	GetCommitTSTime        float64 `gorm:"column:Get_commit_ts_time" json:"get_commit_ts_time"`
	LocalLatchWaitTime     float64 `gorm:"column:Local_latch_wait_time" json:"local_latch_wait_time"`
	ResolveLockTime        float64 `gorm:"column:Resolve_lock_time" json:"resolve_lock_time"`
	PrewriteTime           float64 `gorm:"column:Prewrite_time" json:"prewrite_time"`
	WaitPreWriteBinlogTime float64 `gorm:"column:Wait_prewrite_binlog_time" json:"wait_prewrite_binlog_time"`
	CommitTime             float64 `gorm:"column:Commit_time" json:"commit_time"`
	CommitBackoffTime      float64 `gorm:"column:Commit_backoff_time" json:"commit_backoff_time"`
	CopProcAvg             float64 `gorm:"column:Cop_proc_avg" json:"cop_proc_avg"`
	CopProcP90             float64 `gorm:"column:Cop_proc_p90" json:"cop_proc_p90"`
	CopProcMax             float64 `gorm:"column:Cop_proc_max" json:"cop_proc_max"`
	CopWaitAvg             float64 `gorm:"column:Cop_wait_avg" json:"cop_wait_avg"`
	CopWaitP90             float64 `gorm:"column:Cop_wait_p90" json:"cop_wait_p90"`
	CopWaitMax             float64 `gorm:"column:Cop_wait_max" json:"cop_wait_max"`

	// Transaction
	WriteKeys      int `gorm:"column:Write_keys" json:"write_keys"`
	WriteSize      int `gorm:"column:Write_size" json:"write_size"`
	PrewriteRegion int `gorm:"column:Prewrite_region" json:"prewrite_region"`
	TxnRetry       int `gorm:"column:Txn_retry" json:"txn_retry"`

	// Coprocessor
	RequestCount uint   `gorm:"column:Request_count" json:"request_count"`
	ProcessKeys  uint   `gorm:"column:Process_keys" json:"process_keys"`
	TotalKeys    uint   `gorm:"column:Total_keys" json:"total_keys"`
	CopProcAddr  string `gorm:"column:Cop_proc_addr" json:"cop_proc_addr"`
	CopWaitAddr  string `gorm:"column:Cop_wait_addr" json:"cop_wait_addr"`

	// RocksDB
	RocksdbDeleteSkippedCount uint `gorm:"column:Rocksdb_delete_skipped_count" json:"rocksdb_delete_skipped_count"`
	RocksdbKeySkippedCount    uint `gorm:"column:Rocksdb_key_skipped_count" json:"rocksdb_key_skipped_count"`
	RocksdbBlockCacheHitCount uint `gorm:"column:Rocksdb_block_cache_hit_count" json:"rocksdb_block_cache_hit_count"`
	RocksdbBlockReadCount     uint `gorm:"column:Rocksdb_block_read_count" json:"rocksdb_block_read_count"`
	RocksdbBlockReadByte      uint `gorm:"column:Rocksdb_block_read_byte" json:"rocksdb_block_read_byte"`

	// Computed fields
	BinaryPlanJSON string `json:"binary_plan_json"` // binary plan json format
	BinaryPlanText string `json:"binary_plan_text"` // binary plan plain text

	// Resource Control
	RU            float64 `gorm:"column:RU" json:"ru" proj:"(Request_unit_write + Request_unit_read)" related:"Request_unit_write,Request_unit_read"`
	QueuedTime    float64 `gorm:"column:Time_queued_by_rc" json:"time_queued_by_rc"`
	ResourceGroup string  `gorm:"column:Resource_group" json:"resource_group"`
}

type Field struct {
	ColumnName string
	JSONName   string
	Projection string
	// `related` tag is used to verify a non-existent column, which is aggregated/projection from the columns represented by related.
	Related []string
}

func getFieldsAndTags() (slowQueryFields []Field) {
	fields := reflectutil.GetFieldsAndTags(Model{}, []string{"gorm", "proj", "json", "related"})

	for _, f := range fields {
		sqf := Field{
			ColumnName: utils.GetGormColumnName(f.Tags["gorm"]),
			JSONName:   f.Tags["json"],
			Projection: f.Tags["proj"],
		}

		if f.Tags["related"] != "" {
			sqf.Related = strings.Split(f.Tags["related"], ",")
		}

		slowQueryFields = append(slowQueryFields, sqf)
	}

	return
}

func filterFieldsByColumns(fields []Field, columns []string) []Field {
	colMap := map[string]struct{}{}
	for _, c := range columns {
		colMap[strings.ToLower(c)] = struct{}{}
	}

	filteredFields := []Field{}
	for _, f := range fields {
		_, ok := colMap[strings.ToLower(f.ColumnName)]
		if ok || (f.Projection != "") {
			filteredFields = append(filteredFields, f)
		}
	}

	return filteredFields
}
