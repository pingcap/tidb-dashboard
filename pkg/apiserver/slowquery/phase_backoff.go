// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package slowquery

import (
	"regexp"
	"strconv"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/pingcap/tidb-dashboard/pkg/utils"
)

var missingClusterColumn = regexp.MustCompile(`Column ID (\d+) of table cluster_slow_query not found`)

func isPhaseColumn(name string) bool {
	return strings.EqualFold(name, "prewrite_backoff_types") || strings.EqualFold(name, "commit_backoff_types")
}

func withoutPhaseColumns(columns []string) []string {
	result := make([]string, 0, len(columns))
	for _, column := range columns {
		if !isPhaseColumn(column) {
			result = append(result, column)
		}
	}
	return result
}

func isMissingPhaseColumn(err error, columns []string) bool {
	if err == nil {
		return false
	}
	match := missingClusterColumn.FindStringSubmatch(err.Error())
	if len(match) != 2 {
		return false
	}
	id, _ := strconv.Atoi(match[1])
	// CLUSTER_SLOW_QUERY assigns column IDs in DESC order, starting at 1.
	return id > 0 && id <= len(columns) && isPhaseColumn(columns[id-1])
}

func getSlowQueryColumns(sysSchema *utils.SysSchema, db *gorm.DB, includePhases bool) ([]string, error) {
	if !includePhases {
		return sysSchema.GetTableColumnNames(db, SlowQueryTable)
	}

	// Do not cache phase capability: reconnects and rolling upgrades can change it.
	var schema []struct{ Field string }
	if err := db.Session(&gorm.Session{}).Raw("DESC " + SlowQueryTable).Scan(&schema).Error; err != nil {
		return nil, err
	}
	columns := make([]string, 0, len(schema))
	var phaseColumns []string
	for _, column := range schema {
		columns = append(columns, column.Field)
		if isPhaseColumn(column.Field) {
			phaseColumns = append(phaseColumns, column.Field)
		}
	}
	if len(phaseColumns) == 0 {
		return columns, nil
	}

	// A connected-node DESC does not prove remote reader support. A nonempty future
	// time window dispatches the phase projection to every reader while allowing
	// slow-log time pruning. LIMIT 0 would skip execution and cannot test capability.
	var probe []Model
	// An unsupported remote column is expected during upgrades. Avoid logging every
	// capability probe as a SQL error; unrelated failures still propagate to the caller.
	err := db.Session(&gorm.Session{Logger: db.Logger.LogMode(logger.Silent)}).Raw("SELECT " + strings.Join(phaseColumns, ", ") + " FROM " + SlowQueryTable +
		" WHERE Time BETWEEN '2100-01-01 00:00:00' AND '2100-01-01 00:00:01'").Scan(&probe).Error
	if isMissingPhaseColumn(err, columns) {
		return withoutPhaseColumns(columns), nil
	}
	return columns, err
}

func requestsPhaseFields(req *GetListRequest) bool {
	if req.Fields == "*" || isPhaseColumn(req.OrderBy) || req.PrewriteBackoffTypes != nil || req.CommitBackoffTypes != nil {
		return true
	}
	for _, field := range strings.Split(req.Fields, ",") {
		if isPhaseColumn(field) {
			return true
		}
	}
	return false
}

func hasPhaseCondition(req *GetListRequest) bool {
	return isPhaseColumn(req.OrderBy) || req.PrewriteBackoffTypes != nil || req.CommitBackoffTypes != nil
}
