// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package statement

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/pingcap/errors"
	"gorm.io/gorm"
)

const (
	statementsTable = "INFORMATION_SCHEMA.CLUSTER_STATEMENTS_SUMMARY_HISTORY"
)

var digestInjectChecker = regexp.MustCompile(`^[a-zA-Z0-9]+$`)

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
	schemas, resourceGroups, stmtTypes []string,
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

	if len(resourceGroups) > 0 {
		query = query.Where("resource_group in (?)", resourceGroups)
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
		"stmt_type", // required by quick plan binding
		"plan_hint", // required by quick plan binding, only available in TiDB 6.6.0+, could be filter out by `tableColumns`
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

func (s *Service) queryPlanBinding(db *gorm.DB, sqlDigest string, beginTime, endTime int) (bindings []Binding, err error) {
	// The binding sql digest is newly generated and different from the original sql digest,
	// we have to do one more query here.

	// First, get plan digests by sql digest.
	q1 := db.
		Table(statementsTable).
		Select("plan_digest").
		Where("digest = ? AND summary_begin_time <= FROM_UNIXTIME(?) AND summary_end_time > FROM_UNIXTIME(?)", sqlDigest, endTime, beginTime)
	q1Res := make([]map[string]any, 0)
	if err := q1.Find(&q1Res).Error; err != nil {
		return nil, err
	}
	planDigests := make([]string, 0, len(q1Res))
	for _, row := range q1Res {
		s, ok := row["plan_digest"].(string)
		if !ok {
			return nil, errors.New("invalid plan digest value")
		}
		planDigests = append(planDigests, s)
	}

	// Second, get bindings.
	query := db.Raw("SHOW GLOBAL BINDINGS WHERE plan_digest IN (?) AND source = ? AND status IN (?)", planDigests, "history", []string{"enabled", "using"})
	return bindings, query.Scan(&bindings).Error
}

func (s *Service) createPlanBinding(db *gorm.DB, planDigest string) (err error) {
	// Caution! SQL injection vulnerability!
	// We have to interpolate sql string here, since plan binding stmt does not support session level prepare.
	// go-sql-driver can enable interpolation globally. Refer to https://github.com/go-sql-driver/mysql#interpolateparams.
	if !digestInjectChecker.MatchString(planDigest) {
		return errors.New("invalid planDigest")
	}

	query := db.Exec(fmt.Sprintf("CREATE GLOBAL BINDING FROM HISTORY USING PLAN DIGEST '%s'", planDigest))
	return query.Error
}

func (s *Service) dropPlanBinding(db *gorm.DB, sqlDigest string) (err error) {
	// The binding sql digest is newly generated and different from the original sql digest,
	// we have to do one more query here.
	bindings, err := s.queryPlanBinding(db, sqlDigest, 0, int(time.Now().Unix()))
	if err != nil {
		return err
	}
	if len(bindings) <= 0 {
		return errors.New("no binding found")
	}

	for _, binding := range bindings {
		// No SQL injection vulnerability here.
		query := db.Exec(fmt.Sprintf("DROP GLOBAL BINDING FOR SQL DIGEST '%s'", binding.SQLDigest))
		if query.Error != nil {
			return query.Error
		}
	}

	return nil
}
