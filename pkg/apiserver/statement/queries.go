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
	"database/sql"
	"fmt"
	"strings"
)

func QuerySchemas(DB *sql.DB) ([]string, error) {
	sql := `show databases`
	rows, err := DB.Query(sql)
	schemas := []string{}

	defer func() {
		if rows != nil {
			rows.Close() // close rows which not scan yet
		}
	}()

	if err != nil {
		return schemas, err
	}

	for rows.Next() {
		var dbName string
		err = rows.Scan(&dbName)
		if err != nil {
			return schemas, err
		}
		schemas = append(schemas, dbName)
	}
	return schemas, nil
}

func QueryTimeRanges(DB *sql.DB) ([]*TimeRange, error) {
	sql := `select
	distinct summary_begin_time,summary_end_time
	from cluster_events_statements_summary_by_digest_history
	order by summary_begin_time desc`
	rows, err := DB.Query(sql)
	timeRanges := []*TimeRange{}

	defer func() {
		if rows != nil {
			rows.Close()
		}
	}()

	if err != nil {
		return timeRanges, err
	}

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
func QueryStatementsOverview(DB *sql.DB, schemas []string, beginTime, endTime string) ([]*StatementOverview, error) {
	var schemaWhereClause string
	if len(schemas) > 0 {
		schemaWhereClause = "and schema_name in ('" + strings.Join(schemas, "','") + "')"
	}
	sql := fmt.Sprintf(`select
	schema_name,
	digest,
	digest_text,
	sum(sum_latency),
	sum(exec_count),
	round(sum(exec_count*avg_affected_rows)/sum(exec_count)),
	round(sum(exec_count*avg_latency)/sum(exec_count)),
	round(sum(exec_count*avg_mem)/sum(exec_count))
	from cluster_events_statements_summary_by_digest_history
	where summary_begin_time=?
	and summary_end_time=?
	%s
	group by schema_name,digest,digest_text`, schemaWhereClause)
	rows, err := DB.Query(sql, beginTime, endTime)

	overviews := []*StatementOverview{}

	defer func() {
		if rows != nil {
			rows.Close()
		}
	}()

	if err != nil {
		return overviews, err
	}

	for rows.Next() {
		overview := new(StatementOverview)
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
func QueryStatementDetail(DB *sql.DB, schema, beginTime, endTime, digest string) (*StatementDetail, error) {
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
	row := DB.QueryRow(sql, schema, beginTime, endTime, digest)

	detail := new(StatementDetail)
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
	row = DB.QueryRow(sql, schema, beginTime, endTime, digest)
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
func QueryStatementNodes(DB *sql.DB, schema, beginTime, endTime, digest string) ([]*StatementNode, error) {
	sql := `select
	address,sum_latency,exec_count,avg_latency,max_latency,avg_mem,sum_backoff_times
	from cluster_events_statements_summary_by_digest_history
	where schema_name=?
	and summary_begin_time=?
	and summary_end_time=?
	and digest=?`
	rows, err := DB.Query(sql, schema, beginTime, endTime, digest)
	nodes := []*StatementNode{}

	defer func() {
		if rows != nil {
			rows.Close()
		}
	}()

	if err != nil {
		return nodes, err
	}

	for rows.Next() {
		node := new(StatementNode)
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
