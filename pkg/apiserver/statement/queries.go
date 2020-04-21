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

const (
	statementsTable = "INFORMATION_SCHEMA.CLUSTER_STATEMENTS_SUMMARY_HISTORY"
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
			DISTINCT
			FLOOR(UNIX_TIMESTAMP(summary_begin_time)) AS begin_time,
			FLOOR(UNIX_TIMESTAMP(summary_end_time)) AS end_time
		`).
		Table(statementsTable).
		Order("summary_begin_time DESC").
		Find(&result).Error
	return
}

func QueryStmtTypes(db *gorm.DB) (result []string, err error) {
	// why should put DISTINCT inside the `Pluck()` method, see here:
	// https://github.com/jinzhu/gorm/issues/496
	err = db.
		Table(statementsTable).
		Order("stmt_type ASC").
		Pluck("DISTINCT stmt_type", &result).
		Error
	return
}

// Sample params:
// beginTime: 1586844000
// endTime: 1586845800
// schemas: ["tpcc", "test"]
// stmtTypes: ["select", "update"]
func QueryStatementsOverview(
	db *gorm.DB,
	beginTime, endTime int64,
	schemas, stmtTypes []string) (result []*Overview, err error) {
	fields := append(
		[]string{"schema_name", "digest", "digest_text"},
		getAggrFields("sum_latency", "exec_count", "avg_affected_rows", "max_latency", "avg_latency", "min_latency", "avg_mem", "max_mem", "table_names")...)
	query := db.
		Select(strings.Join(fields, ",")).
		Table(statementsTable).
		Where("UNIX_TIMESTAMP(summary_begin_time) >= ? AND UNIX_TIMESTAMP(summary_end_time) <= ?", beginTime, endTime).
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

	if len(stmtTypes) > 0 {
		query = query.Where("stmt_type in (?)", stmtTypes)
	}

	err = query.Find(&result).Error
	return
}

func QueryPlans(
	db *gorm.DB,
	beginTime, endTime int,
	schemaName, digest string) (result []PlanDetailModel, err error) {
	fields := getAggrFields("plan_digest", "table_names", "digest_text", "digest", "sum_latency", "max_latency", "min_latency", "avg_latency", "exec_count", "avg_mem", "max_mem")
	err = db.
		Select(strings.Join(fields, ",")).
		Table(statementsTable).
		Where("UNIX_TIMESTAMP(summary_begin_time) >= ? AND UNIX_TIMESTAMP(summary_end_time) <= ?", beginTime, endTime).
		Where("schema_name = ?", schemaName).
		Where("digest = ?", digest).
		Group("plan_digest").
		Find(&result).
		Error
	return
}

func QueryPlanDetail(
	db *gorm.DB,
	beginTime, endTime int,
	schemaName, digest string,
	plans []string) (result PlanDetailModel, err error) {
	fields := getAllAggrFields()
	query := db.
		Select(strings.Join(fields, ",")).
		Table(statementsTable).
		Where("UNIX_TIMESTAMP(summary_begin_time) >= ? AND UNIX_TIMESTAMP(summary_end_time) <= ?", beginTime, endTime).
		Where("schema_name = ?", schemaName).
		Where("digest = ?", digest)
	if len(plans) > 0 {
		query = query.Where("plan_digest in (?)", plans)
	}
	err = query.Scan(&result).Error
	return
}
