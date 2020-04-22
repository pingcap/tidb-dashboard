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
	AggExecCount             int    `json:"exec_count" agg:"SUM(exec_count)"`
	AggSumErrors             int    `json:"sum_errors" agg:"SUM(sum_errors)"`
	AggSumWarnings           int    `json:"sum_warnings" agg:"SUM(sum_warnings)"`
	AggSumLatency            int    `json:"sum_latency" agg:"SUM(sum_latency)"`
	AggMaxLatency            int    `json:"max_latency" agg:"MAX(max_latency)"`
	AggMinLatency            int    `json:"min_latency" agg:"MIN(min_latency)"`
	AggAvgLatency            int    `json:"avg_latency" agg:"ROUND(SUM(exec_count * avg_latency) / SUM(exec_count))"`
	AggAvgParseLatency       int    `json:"avg_parse_latency" agg:"ROUND(SUM(exec_count * avg_parse_latency) / SUM(exec_count))"`
	AggMaxParseLatency       int    `json:"max_parse_latency" agg:"MAX(max_parse_latency)"`
	AggAvgCompileLatency     int    `json:"avg_compile_latency" agg:"ROUND(SUM(exec_count * avg_compile_latency) / SUM(exec_count))"`
	AggMaxCompileLatency     int    `json:"max_compile_latency" agg:"MAX(max_compile_latency)"`
	AggSumCopTaskNum         int    `json:"sum_cop_task_num" agg:"SUM(sum_cop_task_num)"`
	AggAvgCopProcessTime     int    `json:"avg_cop_process_time" agg:"ROUND(SUM(exec_count * avg_process_time) / SUM(sum_cop_task_num))"` // avg process time per copr task
	AggMaxCopProcessTime     int    `json:"max_cop_process_time" agg:"MAX(max_cop_process_time)"`                                         // max process time per copr task
	AggAvgCopWaitTime        int    `json:"avg_cop_wait_time" agg:"ROUND(SUM(exec_count * avg_wait_time) / SUM(sum_cop_task_num))"`       // avg process time per copr task
	AggMaxCopWaitTime        int    `json:"max_cop_wait_time" agg:"MAX(max_cop_wait_time)"`                                               // max wait time per copr task
	AggAvgProcessTime        int    `json:"avg_process_time" agg:"ROUND(SUM(exec_count * avg_process_time) / SUM(exec_count))"`           // avg total process time per sql
	AggMaxProcessTime        int    `json:"max_process_time" agg:"MAX(max_process_time)"`                                                 // max process time per sql
	AggAvgWaitTime           int    `json:"avg_wait_time" agg:"ROUND(SUM(exec_count * avg_wait_time) / SUM(exec_count))"`                 // avg total wait time per sql
	AggMaxWaitTime           int    `json:"max_wait_time" agg:"MAX(max_wait_time)"`                                                       // max wait time per sql
	AggAvgBackoffTime        int    `json:"avg_backoff_time" agg:"ROUND(SUM(exec_count * avg_backoff_time) / SUM(exec_count))"`           // avg total back off time per sql
	AggMaxBackoffTime        int    `json:"max_backoff_time" agg:"MAX(max_backoff_time)"`                                                 // max back off time per sql
	AggAvgTotalKeys          int    `json:"avg_total_keys" agg:"ROUND(SUM(exec_count * avg_total_keys) / SUM(exec_count))"`
	AggMaxTotalKeys          int    `json:"max_total_keys" agg:"MAX(max_total_keys)"`
	AggAvgProcessedKeys      int    `json:"avg_processed_keys" agg:"ROUND(SUM(exec_count * avg_processed_keys) / SUM(exec_count))"`
	AggMaxProcessedKeys      int    `json:"max_processed_keys" agg:"MAX(max_processed_keys)"`
	AggAvgPrewriteTime       int    `json:"avg_prewrite_time" agg:"ROUND(SUM(exec_count * avg_prewrite_time) / SUM(exec_count))"`
	AggMaxPrewriteTime       int    `json:"max_prewrite_time" agg:"MAX(max_prewrite_time)"`
	AggAvgCommitTime         int    `json:"avg_commit_time" agg:"ROUND(SUM(exec_count * avg_commit_time) / SUM(exec_count))"`
	AggMaxCommitTime         int    `json:"max_commit_time" agg:"MAX(max_commit_time)"`
	AggAvgGetCommitTsTime    int    `json:"avg_get_commit_ts_time" agg:"ROUND(SUM(exec_count * avg_get_commit_ts_time) / SUM(exec_count))"`
	AggMaxGetCommitTsTime    int    `json:"max_get_commit_ts_time" agg:"MAX(max_get_commit_ts_time)"`
	AggAvgCommitBackoffTime  int    `json:"avg_commit_backoff_time" agg:"ROUND(SUM(exec_count * avg_commit_backoff_time) / SUM(exec_count))"`
	AggMaxCommitBackoffTime  int    `json:"max_commit_backoff_time" agg:"MAX(max_commit_backoff_time)"`
	AggAvgResolveLockTime    int    `json:"avg_resolve_lock_time" agg:"ROUND(SUM(exec_count * avg_resolve_lock_time) / SUM(exec_count))"`
	AggMaxResolveLockTime    int    `json:"max_resolve_lock_time" agg:"MAX(max_resolve_lock_time)"`
	AggAvgLocalLatchWaitTime int    `json:"avg_local_latch_wait_time" agg:"ROUND(SUM(exec_count * avg_local_latch_wait_time) / SUM(exec_count))"`
	AggMaxLocalLatchWaitTime int    `json:"max_local_latch_wait_time" agg:"MAX(max_local_latch_wait_time)"`
	AggAvgWriteKeys          int    `json:"avg_write_keys" agg:"ROUND(SUM(exec_count * avg_write_keys) / SUM(exec_count))"`
	AggMaxWriteKeys          int    `json:"max_write_keys" agg:"MAX(max_write_keys)"`
	AggAvgWriteSize          int    `json:"avg_write_size" agg:"ROUND(SUM(exec_count * avg_write_size) / SUM(exec_count))"`
	AggMaxWriteSize          int    `json:"max_write_size" agg:"MAX(max_write_size)"`
	AggAvgPrewriteRegions    int    `json:"avg_prewrite_regions" agg:"ROUND(SUM(exec_count * avg_prewrite_regions) / SUM(exec_count))"`
	AggMaxPrewriteRegions    int    `json:"max_prewrite_regions" agg:"MAX(max_prewrite_regions)"`
	AggAvgTxnRetry           int    `json:"avg_txn_retry" agg:"ROUND(SUM(exec_count * avg_txn_retry) / SUM(exec_count))"`
	AggMaxTxnRetry           int    `json:"max_txn_retry" agg:"MAX(max_txn_retry)"`
	AggSumBackoffTimes       int    `json:"sum_backoff_times" agg:"SUM(sum_backoff_times)"`
	AggAvgMem                int    `json:"avg_mem" agg:"ROUND(SUM(exec_count * avg_mem) / SUM(exec_count))"`
	AggMaxMem                int    `json:"max_mem" agg:"MAX(max_mem)"`
	AggAvgAffectedRows       int    `json:"avg_affected_rows" agg:"ROUND(SUM(exec_count * avg_affected_rows) / SUM(exec_count))"`
	AggFirstSeen             int    `json:"first_seen" agg:"UNIX_TIMESTAMP(MIN(first_seen))"`
	AggLastSeen              int    `json:"last_seen" agg:"UNIX_TIMESTAMP(MAX(last_seen))"`
	AggSampleUser            string `json:"sample_user" agg:"ANY_VALUE(sample_user)"`
	AggQuerySampleText       string `json:"query_sample_text" agg:"ANY_VALUE(query_sample_text)"`
	AggPrevSampleText        string `json:"prev_sample_text" agg:"ANY_VALUE(prev_sample_text)"`
	AggSchemaName            string `json:"schema_name" agg:"ANY_VALUE(schema_name)"`
	AggTableNames            string `json:"table_names" agg:"ANY_VALUE(table_names)"`
	AggIndexNames            string `json:"index_names" agg:"ANY_VALUE(index_names)"`
	AggDigestText            string `json:"digest_text" agg:"ANY_VALUE(digest_text)"`
	AggDigest                string `json:"digest" agg:"ANY_VALUE(digest)"`
	AggPlanDigest            string `json:"plan_digest" agg:"ANY_VALUE(plan_digest)"`
	AggPlan                  string `json:"plan" agg:"ANY_VALUE(plan)"`
	// Computed fields
	RelatedSchemas string `json:"related_schemas"`
}

func getAggrFields(sqlFields ...string) []string {
	fields := make(map[string]*reflect.StructField)
	t := reflect.TypeOf(Model{})
	fieldsNum := t.NumField()
	for i := 0; i < fieldsNum; i++ {
		field := t.Field(i)
		fields[strings.ToLower(field.Tag.Get("json"))] = &field
	}
	ret := make([]string, 0, len(sqlFields))
	for _, fieldName := range sqlFields {
		if field, ok := fields[strings.ToLower(fieldName)]; ok {
			if agg, ok := field.Tag.Lookup("agg"); ok {
				ret = append(ret, fmt.Sprintf("%s AS %s", agg, gorm.ToColumnName(field.Name)))
			} else {
				panic(fmt.Sprintf("field %s cannot be aggregated", fieldName))
			}
		} else {
			panic(fmt.Sprintf("unknown aggregation field %s", fieldName))
		}
	}
	return ret
}

func getAllAggrFields() []string {
	t := reflect.TypeOf(Model{})
	fieldsNum := t.NumField()
	ret := make([]string, 0, fieldsNum)
	for i := 0; i < fieldsNum; i++ {
		field := t.Field(i)
		if agg, ok := field.Tag.Lookup("agg"); ok {
			ret = append(ret, fmt.Sprintf("%s AS %s", agg, gorm.ToColumnName(field.Name)))
		}
	}
	return ret
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
