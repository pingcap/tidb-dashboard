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
	"strconv"
	"strings"

	"github.com/jinzhu/gorm"
)

const (
	statementsTable        = "INFORMATION_SCHEMA.CLUSTER_STATEMENTS_SUMMARY_HISTORY"
	stmtEnableVar          = "tidb_enable_stmt_summary"
	stmtRefreshIntervalVar = "tidb_stmt_summary_refresh_interval"
	stmtHistroySizeVar     = "tidb_stmt_summary_history_size"
)

// How to get sql variables by GORM
// https://github.com/jinzhu/gorm/issues/2616
func querySQLIntVariable(db *gorm.DB, name string) (int, error) {
	var values []string
	sql := fmt.Sprintf("SELECT @@GLOBAL.%s as value", name) // nolints
	err := db.Raw(sql).Pluck("value", &values).Error
	if err != nil {
		return 0, err
	}
	strVal := values[0]
	if strVal == "" {
		return -1, nil
	}
	intVal, err := strconv.Atoi(strVal)
	if err != nil {
		return 0, err
	}
	return intVal, nil
}

func QueryStmtConfig(db *gorm.DB) (*Config, error) {
	config := Config{}

	enable, err := querySQLIntVariable(db, stmtEnableVar)
	if err != nil {
		return nil, err
	}
	config.Enable = enable != 0

	refreshInterval, err := querySQLIntVariable(db, stmtRefreshIntervalVar)
	if err != nil {
		return nil, err
	}
	if refreshInterval == -1 {
		config.RefreshInterval = 1800
	} else {
		config.RefreshInterval = refreshInterval
	}

	historySize, err := querySQLIntVariable(db, stmtHistroySizeVar)
	if err != nil {
		return nil, err
	}
	if historySize == -1 {
		config.HistorySize = 24
	} else {
		config.HistorySize = historySize
	}

	return &config, err
}

func UpdateStmtConfig(db *gorm.DB, config *Config) (err error) {
	var sql string
	sql = fmt.Sprintf("SET GLOBAL %s = ?", stmtEnableVar)
	err = db.Exec(sql, config.Enable).Error

	if config.Enable {
		// update other configurations
		sql = fmt.Sprintf("SET GLOBAL %s = ?", stmtRefreshIntervalVar)
		err = db.Exec(sql, config.RefreshInterval).Error
		if err != nil {
			return
		}
		sql = fmt.Sprintf("SET GLOBAL %s = ?", stmtHistroySizeVar)
		err = db.Exec(sql, config.HistorySize).Error
	}
	return
}

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
		Order("summary_begin_time DESC, summary_end_time DESC").
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
	schemas, stmtTypes []string) (result []Model, err error) {
	fields := getAggrFields(
		"table_names",
		"schema_name",
		"digest",
		"digest_text",
		"sum_latency",
		"exec_count",
		"max_latency",
		"avg_latency",
		"min_latency",
		"avg_mem",
		"max_mem",
		"sum_errors",
		"sum_warnings",
		"avg_parse_latency",
		"max_parse_latency",
		"avg_compile_latency",
		"max_compile_latency",
		"avg_cop_process_time",
		"max_cop_process_time")
	// `table_names` is used to populate `related_schemas`.
	query := db.
		Select(strings.Join(fields, ", ")).
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
	schemaName, digest string) (result []Model, err error) {
	fields := getAggrFields(
		"plan_digest",
		"schema_name",
		"digest_text",
		"digest",
		"sum_latency",
		"max_latency",
		"min_latency",
		"avg_latency",
		"exec_count",
		"avg_mem",
		"max_mem")
	err = db.
		Select(strings.Join(fields, ", ")).
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
	plans []string) (result Model, err error) {
	fields := getAllAggrFields()
	query := db.
		Select(strings.Join(fields, ", ")).
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
