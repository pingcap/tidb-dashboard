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
	"regexp"
	"sort"
	"strings"

	"github.com/jinzhu/gorm"
)

func QuerySchemas(db *gorm.DB) ([]string, error) {
	sql := `SHOW DATABASES`

	var schemas []string
	err := db.Raw(sql).Pluck("Database", &schemas).Error
	if err != nil {
		return nil, err
	}

	for i, v := range schemas {
		schemas[i] = strings.ToLower(v)
	}
	sort.Strings(schemas)
	return schemas, nil
}

func QueryTimeRanges(db *gorm.DB) (result []*TimeRange, err error) {
	err = db.
		Select(`
			DISTINCT CONVERT(UNIX_TIMESTAMP(summary_begin_time), UNSIGNED INTEGER) AS begin_time,
			CONVERT(UNIX_TIMESTAMP(summary_end_time), UNSIGNED INTEGER) AS end_time
		`).
		Table("PERFORMANCE_SCHEMA.cluster_events_statements_summary_by_digest_history").
		Order("summary_begin_time DESC").
		Find(&result).Error
	return result, err
}

// Sample params:
// schemas: ["tpcc", "test"]
// beginTime: "2020-02-13 10:30:00"
// endTime: "2020-02-13 11:00:00"
func QueryStatementsOverview(db *gorm.DB, schemas []string, beginTime, endTime string) (result []*Overview, err error) {
	query := db.
		Select(`
			schema_name,
			digest,
			digest_text,
			sum(sum_latency) AS agg_sum_latency,
			sum(exec_count) AS agg_exec_count,
			round(sum(exec_count*avg_affected_rows)/sum(exec_count)) AS agg_avg_affected_rows,
			round(sum(exec_count*avg_latency)/sum(exec_count)) AS agg_avg_latency,
			round(sum(exec_count*avg_mem)/sum(exec_count)) AS agg_avg_mem,
			group_concat(table_names) AS agg_table_names
		`).
		Table("PERFORMANCE_SCHEMA.cluster_events_statements_summary_by_digest_history").
		Where("summary_begin_time >= ? AND summary_end_time <= ?", beginTime, endTime).
		Group("schema_name, digest, digest_text").
		Order("agg_sum_latency DESC")

	if len(schemas) > 0 {
		regex := make([]string, 0, len(schemas))
		for _, schema := range schemas {
			regex = append(regex, fmt.Sprintf("\\b%s\\.", regexp.QuoteMeta(schema)))
		}
		regexAll := strings.Join(regex, "|")
		query = query.Where("table_names REGEXP ?", regexAll)
	}

	err = query.Find(&result).Error
	return
}

// Sample params:
// schemas: "tpcc"
// beginTime: "2020-02-13 10:30:00"
// endTime: "2020-02-13 11:00:00"
// digest: "bcaa7bdb37e24d03fb48f20cc32f4ff3f51c0864dc378829e519650df5c7b923"
func QueryStatementDetail(db *gorm.DB, schema, beginTime, endTime, digest string) (*Detail, error) {
	result := &Detail{}

	query := db.
		Select(`
			schema_name,
			digest,
			digest_text,
			sum(sum_latency) AS agg_sum_latency,
			sum(exec_count) AS agg_exec_count,
			round(sum(exec_count*avg_affected_rows)/sum(exec_count)) AS agg_avg_affected_rows,
			round(sum(exec_count*avg_total_keys)/sum(exec_count)) AS agg_avg_total_keys,
			group_concat(table_names) AS agg_table_names
		`).
		Table("PERFORMANCE_SCHEMA.cluster_events_statements_summary_by_digest_history").
		Where("schema_name = ?", schema).
		Where("summary_begin_time >= ? AND summary_end_time <= ?", beginTime, endTime).
		Where("digest = ?", digest).
		Group("digest, digest_text, schema_name")

	if err := query.Scan(&result).Error; err != nil {
		return nil, err
	}

	query = db.
		Select(`query_sample_text, last_seen`).
		Table("PERFORMANCE_SCHEMA.cluster_events_statements_summary_by_digest_history").
		Where("schema_name = ?", schema).
		Where("summary_begin_time >= ? AND summary_end_time <= ?", beginTime, endTime).
		Where("digest = ?", digest).
		Order("last_seen DESC")

	if err := query.First(&result).Error; err != nil {
		return nil, err
	}

	query = db.
		Select(`
			plan_digest,
			plan
		`).
		Table("PERFORMANCE_SCHEMA.cluster_events_statements_summary_by_digest_history").
		Where("schema_name = ?", schema).
		Where("summary_begin_time >= ? AND summary_end_time <= ?", beginTime, endTime).
		Where("digest = ?", digest).
		Where("plan_digest != ''").
		Group("plan_digest, plan")

	if err := query.Find(&result.Plans).Error; err != nil {
		return nil, err
	}

	return result, nil
}

// Sample params:
// schemas: "tpcc"
// beginTime: "2020-02-13 10:30:00"
// endTime: "2020-02-13 11:00:00"
// digest: "bcaa7bdb37e24d03fb48f20cc32f4ff3f51c0864dc378829e519650df5c7b923"
func QueryStatementNodes(db *gorm.DB, schema, beginTime, endTime, digest string) (result []*Node, err error) {
	err = db.
		Select(`
			address,
			sum_latency,
			exec_count,
			avg_latency,
			max_latency,
			avg_mem,
			sum_backoff_times
		`).
		Table("PERFORMANCE_SCHEMA.cluster_events_statements_summary_by_digest_history").
		Where("schema_name = ?", schema).
		Where("summary_begin_time >= ? AND summary_end_time <= ?", beginTime, endTime).
		Where("digest = ?", digest).
		Order("sum_latency DESC").
		Find(&result).Error
	return
}
