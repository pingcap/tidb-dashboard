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

package statement

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/jinzhu/gorm"
	"github.com/thoas/go-funk"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
)

const (
	RelatedTag = "related"
)

type Config struct {
	Enable          bool `json:"enable"`
	RefreshInterval int  `json:"refresh_interval"`
	HistorySize     int  `json:"history_size"`
}

// TimeRange represents a range of time
type TimeRange struct {
	BeginTime int64 `json:"begin_time"`
	EndTime   int64 `json:"end_time"`
}

type Model struct {
	AggDigestText            string `json:"digest_text" agg:"ANY_VALUE(digest_text)"`
	AggDigest                string `json:"digest" agg:"ANY_VALUE(digest)"`
	AggExecCount             int    `json:"exec_count" agg:"SUM(exec_count)"`
	AggSumErrors             int    `json:"sum_errors" agg:"SUM(sum_errors)"`
	AggSumWarnings           int    `json:"sum_warnings" agg:"SUM(sum_warnings)"`
	AggSumLatency            int    `json:"sum_latency" agg:"SUM(sum_latency)"`
	AggMaxLatency            int    `json:"max_latency" agg:"MAX(max_latency)"`
	AggMinLatency            int    `json:"min_latency" agg:"MIN(min_latency)"`
	AggAvgLatency            int    `json:"avg_latency" agg:"CAST(SUM(exec_count * avg_latency) / SUM(exec_count) AS SIGNED)"`
	AggAvgParseLatency       int    `json:"avg_parse_latency" agg:"CAST(SUM(exec_count * avg_parse_latency) / SUM(exec_count) AS SIGNED)"`
	AggMaxParseLatency       int    `json:"max_parse_latency" agg:"MAX(max_parse_latency)"`
	AggAvgCompileLatency     int    `json:"avg_compile_latency" agg:"CAST(SUM(exec_count * avg_compile_latency) / SUM(exec_count) AS SIGNED)"`
	AggMaxCompileLatency     int    `json:"max_compile_latency" agg:"MAX(max_compile_latency)"`
	AggSumCopTaskNum         int    `json:"sum_cop_task_num" agg:"SUM(sum_cop_task_num)"`
	AggAvgCopProcessTime     int    `json:"avg_cop_process_time" agg:"CAST(SUM(exec_count * avg_process_time) / SUM(sum_cop_task_num) AS SIGNED)"` // avg process time per copr task
	AggMaxCopProcessTime     int    `json:"max_cop_process_time" agg:"MAX(max_cop_process_time)"`                                                  // max process time per copr task
	AggAvgCopWaitTime        int    `json:"avg_cop_wait_time" agg:"CAST(SUM(exec_count * avg_wait_time) / SUM(sum_cop_task_num) AS SIGNED)"`       // avg wait time per copr task
	AggMaxCopWaitTime        int    `json:"max_cop_wait_time" agg:"MAX(max_cop_wait_time)"`                                                        // max wait time per copr task
	AggAvgProcessTime        int    `json:"avg_process_time" agg:"CAST(SUM(exec_count * avg_process_time) / SUM(exec_count) AS SIGNED)"`           // avg total process time per sql
	AggMaxProcessTime        int    `json:"max_process_time" agg:"MAX(max_process_time)"`                                                          // max process time per sql
	AggAvgWaitTime           int    `json:"avg_wait_time" agg:"CAST(SUM(exec_count * avg_wait_time) / SUM(exec_count) AS SIGNED)"`                 // avg total wait time per sql
	AggMaxWaitTime           int    `json:"max_wait_time" agg:"MAX(max_wait_time)"`                                                                // max wait time per sql
	AggAvgBackoffTime        int    `json:"avg_backoff_time" agg:"CAST(SUM(exec_count * avg_backoff_time) / SUM(exec_count) AS SIGNED)"`           // avg total back off time per sql
	AggMaxBackoffTime        int    `json:"max_backoff_time" agg:"MAX(max_backoff_time)"`                                                          // max back off time per sql
	AggAvgTotalKeys          int    `json:"avg_total_keys" agg:"CAST(SUM(exec_count * avg_total_keys) / SUM(exec_count) AS SIGNED)"`
	AggMaxTotalKeys          int    `json:"max_total_keys" agg:"MAX(max_total_keys)"`
	AggAvgProcessedKeys      int    `json:"avg_processed_keys" agg:"CAST(SUM(exec_count * avg_processed_keys) / SUM(exec_count) AS SIGNED)"`
	AggMaxProcessedKeys      int    `json:"max_processed_keys" agg:"MAX(max_processed_keys)"`
	AggAvgPrewriteTime       int    `json:"avg_prewrite_time" agg:"CAST(SUM(exec_count * avg_prewrite_time) / SUM(exec_count) AS SIGNED)"`
	AggMaxPrewriteTime       int    `json:"max_prewrite_time" agg:"MAX(max_prewrite_time)"`
	AggAvgCommitTime         int    `json:"avg_commit_time" agg:"CAST(SUM(exec_count * avg_commit_time) / SUM(exec_count) AS SIGNED)"`
	AggMaxCommitTime         int    `json:"max_commit_time" agg:"MAX(max_commit_time)"`
	AggAvgGetCommitTsTime    int    `json:"avg_get_commit_ts_time" agg:"CAST(SUM(exec_count * avg_get_commit_ts_time) / SUM(exec_count) AS SIGNED)"`
	AggMaxGetCommitTsTime    int    `json:"max_get_commit_ts_time" agg:"MAX(max_get_commit_ts_time)"`
	AggAvgCommitBackoffTime  int    `json:"avg_commit_backoff_time" agg:"CAST(SUM(exec_count * avg_commit_backoff_time) / SUM(exec_count) AS SIGNED)"`
	AggMaxCommitBackoffTime  int    `json:"max_commit_backoff_time" agg:"MAX(max_commit_backoff_time)"`
	AggAvgResolveLockTime    int    `json:"avg_resolve_lock_time" agg:"CAST(SUM(exec_count * avg_resolve_lock_time) / SUM(exec_count) AS SIGNED)"`
	AggMaxResolveLockTime    int    `json:"max_resolve_lock_time" agg:"MAX(max_resolve_lock_time)"`
	AggAvgLocalLatchWaitTime int    `json:"avg_local_latch_wait_time" agg:"CAST(SUM(exec_count * avg_local_latch_wait_time) / SUM(exec_count) AS SIGNED)"`
	AggMaxLocalLatchWaitTime int    `json:"max_local_latch_wait_time" agg:"MAX(max_local_latch_wait_time)"`
	AggAvgWriteKeys          int    `json:"avg_write_keys" agg:"CAST(SUM(exec_count * avg_write_keys) / SUM(exec_count) AS SIGNED)"`
	AggMaxWriteKeys          int    `json:"max_write_keys" agg:"MAX(max_write_keys)"`
	AggAvgWriteSize          int    `json:"avg_write_size" agg:"CAST(SUM(exec_count * avg_write_size) / SUM(exec_count) AS SIGNED)"`
	AggMaxWriteSize          int    `json:"max_write_size" agg:"MAX(max_write_size)"`
	AggAvgPrewriteRegions    int    `json:"avg_prewrite_regions" agg:"CAST(SUM(exec_count * avg_prewrite_regions) / SUM(exec_count) AS SIGNED)"`
	AggMaxPrewriteRegions    int    `json:"max_prewrite_regions" agg:"MAX(max_prewrite_regions)"`
	AggAvgTxnRetry           int    `json:"avg_txn_retry" agg:"CAST(SUM(exec_count * avg_txn_retry) / SUM(exec_count) AS SIGNED)"`
	AggMaxTxnRetry           int    `json:"max_txn_retry" agg:"MAX(max_txn_retry)"`
	AggSumBackoffTimes       int    `json:"sum_backoff_times" agg:"SUM(sum_backoff_times)"`
	AggAvgMem                int    `json:"avg_mem" agg:"CAST(SUM(exec_count * avg_mem) / SUM(exec_count) AS SIGNED)"`
	AggMaxMem                int    `json:"max_mem" agg:"MAX(max_mem)"`
	AggAvgDisk               int    `json:"avg_disk" agg:"CAST(SUM(exec_count * avg_disk) / SUM(exec_count) AS SIGNED)"`
	AggMaxDisk               int    `json:"max_disk" agg:"MAX(max_disk)"`
	AggAvgAffectedRows       int    `json:"avg_affected_rows" agg:"CAST(SUM(exec_count * avg_affected_rows) / SUM(exec_count) AS SIGNED)"`
	AggFirstSeen             int    `json:"first_seen" agg:"UNIX_TIMESTAMP(MIN(first_seen))"`
	AggLastSeen              int    `json:"last_seen" agg:"UNIX_TIMESTAMP(MAX(last_seen))"`
	AggSampleUser            string `json:"sample_user" agg:"ANY_VALUE(sample_user)"`
	AggQuerySampleText       string `json:"query_sample_text" agg:"ANY_VALUE(query_sample_text)"`
	AggPrevSampleText        string `json:"prev_sample_text" agg:"ANY_VALUE(prev_sample_text)"`
	AggSchemaName            string `json:"schema_name" agg:"ANY_VALUE(schema_name)"`
	AggTableNames            string `json:"table_names" agg:"ANY_VALUE(table_names)"`
	AggIndexNames            string `json:"index_names" agg:"ANY_VALUE(index_names)"`
	AggPlanCount             int    `json:"plan_count" agg:"COUNT(DISTINCT plan_digest)" related:"plan_digest"`
	AggPlan                  string `json:"plan" agg:"ANY_VALUE(plan)"`
	AggPlanDigest            string `json:"plan_digest" agg:"ANY_VALUE(plan_digest)"`
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
}

var cachedAggrMap map[string]string // jsonFieldName => aggr

func getAggrMap() (map[string]string, error) {
	if cachedAggrMap == nil {
		t := reflect.TypeOf(Model{})
		fieldsNum := t.NumField()
		ret := map[string]string{}

		for i := 0; i < fieldsNum; i++ {
			field := t.Field(i)
			jsonField := strings.ToLower(field.Tag.Get("json"))
			rf, ok := field.Tag.Lookup(RelatedTag)
			var rfs []string
			if ok {
				rfs = strings.Split(rf, ",")
			} else {
				rfs = append(rfs, jsonField)
			}

			// Filtering fields that are not in the table fields
			verified, err := verifiedAggr(rfs)
			if err != nil {
				return nil, err
			}

			if agg, ok := field.Tag.Lookup("agg"); ok && verified {
				ret[jsonField] = fmt.Sprintf("%s AS %s", agg, gorm.ToColumnName(field.Name))
			}
		}
		cachedAggrMap = ret
	}
	return cachedAggrMap, nil
}

func verifiedAggr(relatedFields []string) (bool, error) {
	tcs, err := utils.GetTableColumns(statementsTable)
	if err != nil {
		return false, err
	}

	lowcaseTcs := []string{}
	for _, c := range tcs {
		lowcaseTcs = append(lowcaseTcs, strings.ToLower(c))
	}

	return len(funk.Join(lowcaseTcs, relatedFields, funk.InnerJoin).([]string)) == len(relatedFields), nil
}

func getAggrFields(sqlFields ...string) ([]string, error) {
	aggrMap, err := getAggrMap()
	if err != nil {
		return nil, err
	}

	ret := make([]string, 0, len(sqlFields))
	for _, fieldName := range sqlFields {
		if aggr, ok := aggrMap[strings.ToLower(fieldName)]; ok {
			ret = append(ret, aggr)
		}
	}
	return ret, nil
}

var cachedAllAggrFields []string

func getAllAggrFields() ([]string, error) {
	if cachedAllAggrFields == nil {
		aggrMap, err := getAggrMap()
		if err != nil {
			return nil, err
		}

		ret := make([]string, 0, len(aggrMap))
		for _, aggr := range aggrMap {
			ret = append(ret, aggr)
		}
		cachedAllAggrFields = ret
	}
	return cachedAllAggrFields, nil
}

// tableNames example: "d1.a1,d2.a2,d1.a1,d3.a3"
// return "d1, d2, d3"
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

func (m *Model) AfterFind() error {
	if len(m.AggTableNames) > 0 {
		m.RelatedSchemas = extractSchemasFromTableNames(m.AggTableNames)
	}
	return nil
}
