// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package statement

import (
	"strings"

	"github.com/samber/lo"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/reflectutil"
)

type Model struct {
	AggBeginTime             int     `json:"summary_begin_time" agg:"FLOOR(UNIX_TIMESTAMP(MIN(summary_begin_time)))"`
	AggEndTime               int     `json:"summary_end_time" agg:"FLOOR(UNIX_TIMESTAMP(MAX(summary_end_time)))"`
	AggDigestText            string  `json:"digest_text" agg:"ANY_VALUE(digest_text)"`
	AggDigest                string  `json:"digest" agg:"ANY_VALUE(digest)"`
	AggExecCount             int     `json:"exec_count" agg:"SUM(exec_count)"`
	AggStmtType              string  `json:"stmt_type" agg:"ANY_VALUE(stmt_type)"`
	AggSumErrors             int     `json:"sum_errors" agg:"SUM(sum_errors)"`
	AggSumWarnings           int     `json:"sum_warnings" agg:"SUM(sum_warnings)"`
	AggSumLatency            int     `json:"sum_latency" agg:"SUM(sum_latency)"`
	AggMaxLatency            int     `json:"max_latency" agg:"MAX(max_latency)"`
	AggMinLatency            int     `json:"min_latency" agg:"MIN(min_latency)"`
	AggAvgLatency            int     `json:"avg_latency" agg:"CAST(SUM(exec_count * avg_latency) / SUM(exec_count) AS SIGNED)"`
	AggAvgParseLatency       int     `json:"avg_parse_latency" agg:"CAST(SUM(exec_count * avg_parse_latency) / SUM(exec_count) AS SIGNED)"`
	AggMaxParseLatency       int     `json:"max_parse_latency" agg:"MAX(max_parse_latency)"`
	AggAvgCompileLatency     int     `json:"avg_compile_latency" agg:"CAST(SUM(exec_count * avg_compile_latency) / SUM(exec_count) AS SIGNED)"`
	AggMaxCompileLatency     int     `json:"max_compile_latency" agg:"MAX(max_compile_latency)"`
	AggSumCopTaskNum         int     `json:"sum_cop_task_num" agg:"SUM(sum_cop_task_num)"`
	AggAvgCopProcessTime     int     `json:"avg_cop_process_time" agg:"CAST(SUM(exec_count * avg_process_time) / SUM(sum_cop_task_num) AS SIGNED)"` // avg process time per copr task
	AggMaxCopProcessTime     int     `json:"max_cop_process_time" agg:"MAX(max_cop_process_time)"`                                                  // max process time per copr task
	AggAvgCopWaitTime        int     `json:"avg_cop_wait_time" agg:"CAST(SUM(exec_count * avg_wait_time) / SUM(sum_cop_task_num) AS SIGNED)"`       // avg wait time per copr task
	AggMaxCopWaitTime        int     `json:"max_cop_wait_time" agg:"MAX(max_cop_wait_time)"`                                                        // max wait time per copr task
	AggAvgProcessTime        int     `json:"avg_process_time" agg:"CAST(SUM(exec_count * avg_process_time) / SUM(exec_count) AS SIGNED)"`           // avg total process time per sql
	AggMaxProcessTime        int     `json:"max_process_time" agg:"MAX(max_process_time)"`                                                          // max process time per sql
	AggAvgWaitTime           int     `json:"avg_wait_time" agg:"CAST(SUM(exec_count * avg_wait_time) / SUM(exec_count) AS SIGNED)"`                 // avg total wait time per sql
	AggMaxWaitTime           int     `json:"max_wait_time" agg:"MAX(max_wait_time)"`                                                                // max wait time per sql
	AggAvgBackoffTime        int     `json:"avg_backoff_time" agg:"CAST(SUM(exec_count * avg_backoff_time) / SUM(exec_count) AS SIGNED)"`           // avg total back off time per sql
	AggMaxBackoffTime        int     `json:"max_backoff_time" agg:"MAX(max_backoff_time)"`                                                          // max back off time per sql
	AggAvgTotalKeys          int     `json:"avg_total_keys" agg:"CAST(SUM(exec_count * avg_total_keys) / SUM(exec_count) AS SIGNED)"`
	AggMaxTotalKeys          int     `json:"max_total_keys" agg:"MAX(max_total_keys)"`
	AggAvgProcessedKeys      int     `json:"avg_processed_keys" agg:"CAST(SUM(exec_count * avg_processed_keys) / SUM(exec_count) AS SIGNED)"`
	AggMaxProcessedKeys      int     `json:"max_processed_keys" agg:"MAX(max_processed_keys)"`
	AggAvgPrewriteTime       int     `json:"avg_prewrite_time" agg:"CAST(SUM(exec_count * avg_prewrite_time) / SUM(exec_count) AS SIGNED)"`
	AggMaxPrewriteTime       int     `json:"max_prewrite_time" agg:"MAX(max_prewrite_time)"`
	AggAvgCommitTime         int     `json:"avg_commit_time" agg:"CAST(SUM(exec_count * avg_commit_time) / SUM(exec_count) AS SIGNED)"`
	AggMaxCommitTime         int     `json:"max_commit_time" agg:"MAX(max_commit_time)"`
	AggAvgGetCommitTsTime    int     `json:"avg_get_commit_ts_time" agg:"CAST(SUM(exec_count * avg_get_commit_ts_time) / SUM(exec_count) AS SIGNED)"`
	AggMaxGetCommitTsTime    int     `json:"max_get_commit_ts_time" agg:"MAX(max_get_commit_ts_time)"`
	AggAvgCommitBackoffTime  int     `json:"avg_commit_backoff_time" agg:"CAST(SUM(exec_count * avg_commit_backoff_time) / SUM(exec_count) AS SIGNED)"`
	AggMaxCommitBackoffTime  int     `json:"max_commit_backoff_time" agg:"MAX(max_commit_backoff_time)"`
	AggAvgResolveLockTime    int     `json:"avg_resolve_lock_time" agg:"CAST(SUM(exec_count * avg_resolve_lock_time) / SUM(exec_count) AS SIGNED)"`
	AggMaxResolveLockTime    int     `json:"max_resolve_lock_time" agg:"MAX(max_resolve_lock_time)"`
	AggAvgLocalLatchWaitTime int     `json:"avg_local_latch_wait_time" agg:"CAST(SUM(exec_count * avg_local_latch_wait_time) / SUM(exec_count) AS SIGNED)"`
	AggMaxLocalLatchWaitTime int     `json:"max_local_latch_wait_time" agg:"MAX(max_local_latch_wait_time)"`
	AggAvgWriteKeys          int     `json:"avg_write_keys" agg:"CAST(SUM(exec_count * avg_write_keys) / SUM(exec_count) AS SIGNED)"`
	AggMaxWriteKeys          int     `json:"max_write_keys" agg:"MAX(max_write_keys)"`
	AggAvgWriteSize          int     `json:"avg_write_size" agg:"CAST(SUM(exec_count * avg_write_size) / SUM(exec_count) AS SIGNED)"`
	AggMaxWriteSize          int     `json:"max_write_size" agg:"MAX(max_write_size)"`
	AggAvgPrewriteRegions    int     `json:"avg_prewrite_regions" agg:"CAST(SUM(exec_count * avg_prewrite_regions) / SUM(exec_count) AS SIGNED)"`
	AggMaxPrewriteRegions    int     `json:"max_prewrite_regions" agg:"MAX(max_prewrite_regions)"`
	AggAvgTxnRetry           int     `json:"avg_txn_retry" agg:"CAST(SUM(exec_count * avg_txn_retry) / SUM(exec_count) AS SIGNED)"`
	AggMaxTxnRetry           int     `json:"max_txn_retry" agg:"MAX(max_txn_retry)"`
	AggSumBackoffTimes       int     `json:"sum_backoff_times" agg:"SUM(sum_backoff_times)"`
	AggAvgMem                int     `json:"avg_mem" agg:"CAST(SUM(exec_count * avg_mem) / SUM(exec_count) AS SIGNED)"`
	AggMaxMem                int     `json:"max_mem" agg:"MAX(max_mem)"`
	AggAvgDisk               int     `json:"avg_disk" agg:"CAST(SUM(exec_count * avg_disk) / SUM(exec_count) AS SIGNED)"`
	AggMaxDisk               int     `json:"max_disk" agg:"MAX(max_disk)"`
	AggAvgAffectedRows       int     `json:"avg_affected_rows" agg:"CAST(SUM(exec_count * avg_affected_rows) / SUM(exec_count) AS SIGNED)"`
	AggFirstSeen             int     `json:"first_seen" agg:"UNIX_TIMESTAMP(MIN(first_seen))"`
	AggLastSeen              int     `json:"last_seen" agg:"UNIX_TIMESTAMP(MAX(last_seen))"`
	AggSampleUser            string  `json:"sample_user" agg:"ANY_VALUE(sample_user)"`
	AggQuerySampleText       string  `json:"query_sample_text" agg:"ANY_VALUE(query_sample_text)"`
	AggPrevSampleText        string  `json:"prev_sample_text" agg:"ANY_VALUE(prev_sample_text)"`
	AggSchemaName            string  `json:"schema_name" agg:"ANY_VALUE(schema_name)"`
	AggTableNames            string  `json:"table_names" agg:"ANY_VALUE(table_names)"`
	AggIndexNames            string  `json:"index_names" agg:"ANY_VALUE(index_names)"`
	AggPlanCount             int     `json:"plan_count" agg:"COUNT(DISTINCT plan_digest)" related:"plan_digest"`
	AggPlan                  string  `json:"plan" agg:"ANY_VALUE(plan)"` // deprecated, replaced by BinaryPlanText
	AggBinaryPlan            string  `json:"binary_plan" agg:"ANY_VALUE(binary_plan)"`
	AggPlanDigest            string  `json:"plan_digest" agg:"ANY_VALUE(plan_digest)"`
	AggPlanHint              *string `json:"plan_hint" agg:"ANY_VALUE(plan_hint)"`
	AggPlanCacheHits         int     `json:"plan_cache_hits" agg:"SUM(plan_cache_hits)"`

	// RocksDB
	AggMaxRocksdbDeleteSkippedCount uint `json:"max_rocksdb_delete_skipped_count" agg:"MAX(max_rocksdb_delete_skipped_count)"`
	AggAvgRocksdbDeleteSkippedCount uint `json:"avg_rocksdb_delete_skipped_count" agg:"CAST(SUM(exec_count * avg_rocksdb_delete_skipped_count) / SUM(exec_count) as SIGNED)"`
	AggMaxRocksdbKeySkippedCount    uint `json:"max_rocksdb_key_skipped_count" agg:"MAX(max_rocksdb_key_skipped_count)"`
	AggAvgRocksdbKeySkippedCount    uint `json:"avg_rocksdb_key_skipped_count" agg:"CAST(SUM(exec_count * avg_rocksdb_key_skipped_count) / SUM(exec_count) as SIGNED)"`
	AggMaxRocksdbBlockCacheHitCount uint `json:"max_rocksdb_block_cache_hit_count" agg:"MAX(max_rocksdb_block_cache_hit_count)"`
	AggAvgRocksdbBlockCacheHitCount uint `json:"avg_rocksdb_block_cache_hit_count" agg:"CAST(SUM(exec_count * avg_rocksdb_block_cache_hit_count) / SUM(exec_count) as SIGNED)"`
	AggMaxRocksdbBlockReadCount     uint `json:"max_rocksdb_block_read_count" agg:"MAX(max_rocksdb_block_read_count)"`
	AggAvgRocksdbBlockReadCount     uint `json:"avg_rocksdb_block_read_count" agg:"CAST(SUM(exec_count * avg_rocksdb_block_read_count) / SUM(exec_count) as SIGNED)"`
	AggMaxRocksdbBlockReadByte      uint `json:"max_rocksdb_block_read_byte" agg:"MAX(max_rocksdb_block_read_byte)"`
	AggAvgRocksdbBlockReadByte      uint `json:"avg_rocksdb_block_read_byte" agg:"CAST(SUM(exec_count * avg_rocksdb_block_read_byte) / SUM(exec_count) as SIGNED)"`
	// Computed fields
	RelatedSchemas string `json:"related_schemas"`
	PlanCanBeBound bool   `json:"plan_can_be_bound"`
	BinaryPlanJSON string `json:"binary_plan_json"`
	BinaryPlanText string `json:"binary_plan_text"`

	// Resource Control
	AggResourceGroup string  `json:"resource_group" agg:"ANY_VALUE(resource_group)"`
	AggAvgRU         float64 `json:"avg_ru" agg:"CAST(AVG(avg_request_unit_write + avg_request_unit_read) AS DECIMAL(64, 2))" related:"avg_request_unit_write,avg_request_unit_read"`
	AggMaxRU         float64 `json:"max_ru" agg:"MAX(max_request_unit_write + max_request_unit_read)" related:"max_request_unit_write,max_request_unit_read"`
	AggSumRU         float64 `json:"sum_ru" agg:"CAST(SUM(exec_count * (avg_request_unit_write + avg_request_unit_read)) AS DECIMAL(64, 2))" related:"avg_request_unit_write,avg_request_unit_read"`
	AvgQueuedTime    float64 `json:"avg_time_queued_by_rc" agg:"CAST(AVG(AVG_QUEUED_RC_TIME) AS DECIMAL(64, 2))" related:"AVG_QUEUED_RC_TIME"`
	MaxQueuedTime    float64 `json:"max_time_queued_by_rc" agg:"Max(MAX_QUEUED_RC_TIME)" related:"MAX_QUEUED_RC_TIME"`
}

// tableNames example: "d1.a1,d2.a2,d1.a1,d3.a3"
// return "d1, d2, d3".
func extractSchemasFromTableNames(tableNames string) string {
	schemas := make(map[string]bool)
	tables := strings.Split(tableNames, ",")
	for _, v := range tables {
		schema := strings.Trim(strings.Split(v, ".")[0], " ")
		if len(schema) > 0 {
			schemas[schema] = true
		}
	}
	keys := make([]string, 0, len(schemas))
	for k := range schemas {
		keys = append(keys, k)
	}
	return strings.Join(keys, ", ")
}

// checkSupportPlanBinding checks if whether the plan can be bound manually with sql `CREATE GLOBAL BINDING FROM HISTORY USING PLAN DIGEST '%s'`.
func (m *Model) checkSupportPlanBinding() bool {
	if !lo.Contains([]string{"SELECT", "DELETE", "UPDATE", "INSERT", "REPLACE"}, strings.ToUpper(m.AggStmtType)) {
		return false
	}
	if m.AggPlanHint != nil && *m.AggPlanHint == "" {
		return false
	}
	return true
}

func (m *Model) AfterFind(_ *gorm.DB) error {
	if len(m.AggTableNames) > 0 {
		m.RelatedSchemas = extractSchemasFromTableNames(m.AggTableNames)
	}
	m.PlanCanBeBound = m.checkSupportPlanBinding()
	return nil
}

type Field struct {
	ColumnName string
	JSONName   string
	// `related` tag is used to verify a non-existent column, which is aggregated from the columns represented by related.
	Related     []string
	Aggregation string
}

var gormDefaultNamingStrategy = schema.NamingStrategy{}

func getFieldsAndTags() (stmtFields []Field) {
	fields := reflectutil.GetFieldsAndTags(Model{}, []string{"related", "agg", "json"})

	for _, f := range fields {
		sf := Field{
			ColumnName:  gormDefaultNamingStrategy.ColumnName("", f.Name),
			JSONName:    f.Tags["json"],
			Related:     []string{},
			Aggregation: f.Tags["agg"],
		}

		if f.Tags["related"] != "" {
			sf.Related = strings.Split(f.Tags["related"], ",")
		}

		stmtFields = append(stmtFields, sf)
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
		// The json name of Statement is currently exactly the same as the table column name
		// TODO: use util.VirtualView instead of the convention in the comment
		_, ok := colMap[strings.ToLower(f.JSONName)]
		if ok || (len(f.Related) != 0 && utils.IsSubsetICaseInsensitive(columns, f.Related)) {
			filteredFields = append(filteredFields, f)
		}
	}

	return filteredFields
}

// Binding struct maps to the response of `SHOW BINDINGS` query.
type Binding struct {
	Status     string `json:"status" example:"enabled" enums:"enabled,using,disabled,deleted,invalid,rejected,pending verify"`
	Source     string `json:"source" example:"manual" enums:"manual,history,capture,evolve"`
	SQLDigest  string `json:"-" gorm:"column:Sql_digest"`
	PlanDigest string `json:"plan_digest" gorm:"column:Plan_digest"`
}
