// Copyright 2023 PingCAP, Inc. Licensed under Apache-2.0.

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
		// https://stackoverflow.com/questions/3269434/whats-the-most-efficient-way-to-test-if-two-ranges-overlap
		Where("summary_begin_time <= FROM_UNIXTIME(?) AND summary_end_time >= FROM_UNIXTIME(?)", endTime, beginTime).
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
				 OR LOWER(table_names) REGEXP ?`,
				v, v, v, v,
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
		Where("summary_begin_time <= FROM_UNIXTIME(?) AND summary_end_time >= FROM_UNIXTIME(?)", endTime, beginTime).
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
		Where("summary_begin_time <= FROM_UNIXTIME(?) AND summary_end_time >= FROM_UNIXTIME(?)", endTime, beginTime)

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

func (s *Service) queryPlanBinding(db *gorm.DB, sqlDigest string) (bindings []Binding, err error) {
	query := db.Raw("SHOW GLOBAL BINDINGS WHERE sql_digest = ? AND source = ? AND status IN (?)", sqlDigest, "history", []string{"Enabled", "Using"})
	return nil, query.Scan(&bindings).Error
}

func (s *Service) createPlanBinding(db *gorm.DB, planDigest string) (err error) {
	query := db.Exec("CREATE BINDING FROM HISTORY USING PLAN DIGEST ?", planDigest)
	return query.Error
}

func (s *Service) dropPlanBinding(db *gorm.DB, sqlDigest string) (err error) {
	query := db.Exec("DROP BINDING FOR SQL DIGEST ?", sqlDigest)
	return query.Error
}
