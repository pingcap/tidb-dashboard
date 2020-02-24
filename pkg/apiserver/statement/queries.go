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
	"sort"
	"strings"

	"github.com/jinzhu/gorm"
)

const (
	selectPerformanceDB = "use performance_schema"
)

func QuerySchemas(db *gorm.DB) ([]string, error) {
	sql := `show databases`
	schemas := []string{}

	db.Exec(selectPerformanceDB)
	err := db.Raw(sql).Pluck("Database", &schemas).Error
	if err != nil {
		return schemas, err
	}

	for i, v := range schemas {
		schemas[i] = strings.ToLower(v)
	}
	sort.Strings(schemas)
	return schemas, nil
}

func QueryTimeRanges(db *gorm.DB) ([]*TimeRange, error) {
	sql := `select
	distinct summary_begin_time,summary_end_time
	from cluster_events_statements_summary_by_digest_history
	order by summary_begin_time desc`
	timeRanges := []*TimeRange{}

	db.Exec(selectPerformanceDB)
	rows, err := db.Raw(sql).Rows()
	if err != nil {
		return timeRanges, err
	}
	defer rows.Close()

	for rows.Next() {
		timeRange := new(TimeRange)
		err = rows.Scan(&timeRange.BeginTime, &timeRange.EndTime)
		if err != nil {
			return timeRanges, err
		}
		timeRanges = append(timeRanges, timeRange)
	}
	return timeRanges, nil
}

// Sample params:
// schemas: ["tpcc", "test"]
// beginTime: "2020-02-13 10:30:00"
// endTime: "2020-02-13 11:00:00"
func QueryStatementsOverview(db *gorm.DB, schemas []string, beginTime, endTime string) ([]*Overview, error) {
	var tableNamesCondition string
	var tableNamesRegex string
	if len(schemas) > 0 {
		regexs := []string{}
		for _, v := range schemas {
			regexs = append(regexs, fmt.Sprintf("^%s\\.", v))
			regexs = append(regexs, fmt.Sprintf(",%s\\.", v))
		}
		// if schemas = ["aa", "bb"], get "^aa\.|,aa\.|^bb\.|,bb\."
		tableNamesRegex = strings.Join(regexs, "|")
		tableNamesCondition = "and table_names regexp ?"
	} else {
		tableNamesRegex = "1"
		tableNamesCondition = "and '1' = ?"
	}
	sql := fmt.Sprintf(`select
	schema_name,
	digest,
	digest_text,
	sum(sum_latency) as total_latency,
	sum(exec_count),
	round(sum(exec_count*avg_affected_rows)/sum(exec_count)),
	round(sum(exec_count*avg_latency)/sum(exec_count)),
	round(sum(exec_count*avg_mem)/sum(exec_count))
	from cluster_events_statements_summary_by_digest_history
	where summary_begin_time=?
	and summary_end_time=?
	%s
	group by schema_name,digest,digest_text
	order by total_latency desc`,
		tableNamesCondition)
	overviews := []*Overview{}

	db.Exec(selectPerformanceDB)
	rows, err := db.Raw(sql, beginTime, endTime, tableNamesRegex).Rows()
	if err != nil {
		return overviews, err
	}
	defer rows.Close()

	for rows.Next() {
		overview := new(Overview)
		err = rows.Scan(
			&overview.SchemaName,
			&overview.Digest,
			&overview.DigestText,
			&overview.SumLatency,
			&overview.ExecCount,
			&overview.AvgAffectedRows,
			&overview.AvgLatency,
			&overview.AvgMem,
		)
		if err != nil {
			return overviews, err
		}
		overviews = append(overviews, overview)
	}
	return overviews, nil
}

// Sample params:
// schemas: "tpcc"
// beginTime: "2020-02-13 10:30:00"
// endTime: "2020-02-13 11:00:00"
// digest: "bcaa7bdb37e24d03fb48f20cc32f4ff3f51c0864dc378829e519650df5c7b923"
func QueryStatementDetail(db *gorm.DB, schema, beginTime, endTime, digest string) (*Detail, error) {
	sql := `select
	schema_name,
	digest,
	digest_text,
	sum(sum_latency),
	sum(exec_count),
	round(sum(exec_count*avg_affected_rows)/sum(exec_count)),
	round(sum(exec_count*avg_total_keys)/sum(exec_count))
	from cluster_events_statements_summary_by_digest_history
	where schema_name=?
	and summary_begin_time=?
	and summary_end_time=?
	and digest=?
	group by schema_name,digest,digest_text`
	detail := new(Detail)

	db.Exec(selectPerformanceDB)
	row := db.Raw(sql, schema, beginTime, endTime, digest).Row()
	if err := row.Scan(
		&detail.SchemaName,
		&detail.Digest,
		&detail.DigestText,
		&detail.SumLatency,
		&detail.ExecCount,
		&detail.AvgAffectedRows,
		&detail.AvgTotalKeys,
	); err != nil {
		return detail, err
	}

	sql = `select
	query_sample_text,last_seen
	from cluster_events_statements_summary_by_digest_history
	where schema_name=?
	and summary_begin_time=?
	and summary_end_time=?
	and digest=?
	order by last_seen desc
	limit 1`
	row = db.Raw(sql, schema, beginTime, endTime, digest).Row()
	if err := row.Scan(&detail.QuerySampleText, &detail.LastSeen); err != nil {
		return detail, err
	}
	return detail, nil
}

// Sample params:
// schemas: "tpcc"
// beginTime: "2020-02-13 10:30:00"
// endTime: "2020-02-13 11:00:00"
// digest: "bcaa7bdb37e24d03fb48f20cc32f4ff3f51c0864dc378829e519650df5c7b923"
func QueryStatementNodes(db *gorm.DB, schema, beginTime, endTime, digest string) ([]*Node, error) {
	sql := `select
	address,sum_latency,exec_count,avg_latency,max_latency,avg_mem,sum_backoff_times
	from cluster_events_statements_summary_by_digest_history
	where schema_name=?
	and summary_begin_time=?
	and summary_end_time=?
	and digest=?
	order by sum_latency desc`
	nodes := []*Node{}

	db.Exec(selectPerformanceDB)
	rows, err := db.Raw(sql, schema, beginTime, endTime, digest).Rows()
	if err != nil {
		return nodes, err
	}
	defer rows.Close()

	for rows.Next() {
		node := new(Node)
		err = rows.Scan(
			&node.Address,
			&node.SumLatency,
			&node.ExecCount,
			&node.AvgLatency,
			&node.MaxLatency,
			&node.AvgMem,
			&node.SumBackoffTimes,
		)
		if err != nil {
			return nodes, err
		}
		nodes = append(nodes, node)
	}
	return nodes, nil
}
