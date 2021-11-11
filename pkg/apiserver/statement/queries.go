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
	"strings"

	"gorm.io/gorm"
)

const (
	statementsTable = "INFORMATION_SCHEMA.CLUSTER_STATEMENTS_SUMMARY_HISTORY"
)

func queryTimeRanges(db *gorm.DB) (result []*TimeRange, err error) {
	err = db.
		Select(`
			DISTINCT
			FLOOR(UNIX_TIMESTAMP(summary_begin_time)) AS begin_time,
			FLOOR(UNIX_TIMESTAMP(summary_end_time)) AS end_time
		`).
		Table(statementsTable).
		Order("begin_time DESC, end_time DESC").
		Find(&result).Error
	return
}

func queryStmtTypes(db *gorm.DB) (result []string, err error) {
	// why should put DISTINCT inside the `Pluck()` method, see here:
	// https://github.com/jinzhu/gorm/issues/496
	err = db.
		Table(statementsTable).
		Order("stmt_type ASC").
		Pluck("DISTINCT stmt_type", &result).
		Error
	return
}

// sample params:
// beginTime: 1586844000
// endTime: 1586845800
// schemas: ["tpcc", "test"]
// stmtTypes: ["select", "update"]
// fields: ["digest_text", "sum_latency"]
func (s *Service) queryStatements(
	db *gorm.DB,
	beginTime, endTime int,
	schemas, stmtTypes []string,
	text string,
	reqFields []string,
) (result []Model, err error) {
	tableColumns, err := s.params.SysSchema.GetTableColumnNames(db, statementsTable)
	if err != nil {
		return nil, err
	}

	selectStmt, err := s.genSelectStmt(tableColumns, reqFields)
	if err != nil {
		return nil, err
	}

	query := db.
		Select(selectStmt).
		Table(statementsTable).
		Where("summary_begin_time >= FROM_UNIXTIME(?) AND summary_end_time <= FROM_UNIXTIME(?)", beginTime, endTime).
		Group("schema_name, digest").
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

	if len(text) > 0 {
		lowerText := strings.ToLower(text)
		arr := strings.Fields(lowerText)
		for _, v := range arr {
			query = query.Where(
				`LOWER(digest_text) REGEXP ?
				 OR LOWER(digest) REGEXP ?
				 OR LOWER(schema_name) REGEXP ?
				 OR LOWER(table_names) REGEXP ?
				 OR LOWER(plan) REGEXP ?`,
				v, v, v, v, v,
			)
		}
	}

	err = query.Find(&result).Error
	return
}

func (s *Service) queryPlans(
	db *gorm.DB,
	beginTime, endTime int,
	schemaName, digest string,
) (result []Model, err error) {
	tableColumns, err := s.params.SysSchema.GetTableColumnNames(db, statementsTable)
	if err != nil {
		return nil, err
	}

	selectStmt, err := s.genSelectStmt(tableColumns, []string{
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
		"max_mem",
	})
	if err != nil {
		return nil, err
	}

	query := db.
		Select(selectStmt).
		Table(statementsTable).
		Where("summary_begin_time >= FROM_UNIXTIME(?) AND summary_end_time <= FROM_UNIXTIME(?)", beginTime, endTime).
		Group("plan_digest")

	if digest == "" {
		// the evicted record's digest will be NULL
		query.Where("digest IS NULL")
	} else {
		if schemaName != "" {
			query.Where("schema_name = ?", schemaName)
		}
		query.Where("digest = ?", digest)
	}

	err = query.Find(&result).Error

	return
}

func (s *Service) queryPlanDetail(
	db *gorm.DB,
	beginTime, endTime int,
	schemaName, digest string,
	plans []string,
) (result Model, err error) {
	tableColumns, err := s.params.SysSchema.GetTableColumnNames(db, statementsTable)
	if err != nil {
		return
	}

	selectStmt, err := s.genSelectStmt(tableColumns, []string{"*"})
	if err != nil {
		return
	}

	query := db.
		Select(selectStmt).
		Table(statementsTable).
		Where("summary_begin_time >= FROM_UNIXTIME(?) AND summary_end_time <= FROM_UNIXTIME(?)", beginTime, endTime)

	if digest == "" {
		// the evicted record's digest will be NULL
		query.Where("digest IS NULL")
	} else {
		if schemaName != "" {
			query.Where("schema_name = ?", schemaName)
		}
		if len(plans) > 0 {
			query = query.Where("plan_digest in (?)", plans)
		}
		query.Where("digest = ?", digest)
	}

	err = query.Scan(&result).Error
	return
}
