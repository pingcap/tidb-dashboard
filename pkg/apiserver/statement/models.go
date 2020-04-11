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
	"strings"
)

// TimeRange represents a range of time
type TimeRange struct {
	BeginTime int64 `json:"begin_time"`
	EndTime   int64 `json:"end_time"`
}

// Overview represents the overview of a statement
type Overview struct {
	SchemaName         string `json:"schema_name"`
	Digest             string `json:"digest"`
	DigestText         string `json:"digest_text"`
	AggSumLatency      int    `json:"sum_latency"`
	AggAvgLatency      int    `json:"avg_latency"`
	AggExecCount       int    `json:"exec_count"`
	AggAvgAffectedRows int    `json:"avg_affected_rows"`
	AggAvgMem          int    `json:"avg_mem"`

	AggTableNames string `json:"agg_table_names"`
	// Schemas is extracted from table_names column
	// table_names example: "d1.t1,d2.t2", we extract the "d1,d2" as schemas
	AggSchemas string `json:"schemas"`
}

// Detail represents the detail of a statement
type Detail struct {
	SchemaName         string `json:"schema_name"`
	Digest             string `json:"digest"`
	DigestText         string `json:"digest_text"`
	AggSumLatency      int    `json:"sum_latency"`
	AggExecCount       int    `json:"exec_count"`
	AggAvgAffectedRows int    `json:"avg_affected_rows"`
	AggAvgTotalKeys    int    `json:"avg_total_keys"`

	AggTableNames string `json:"agg_table_names"`
	// Schemas is extracted from table_names column
	// table_names example: "d1.t1,d2.t2", we extract the "d1,d2" as schemas
	AggSchemas string `json:"schemas"`

	QuerySampleText string `json:"query_sample_text"`
	LastSeen        string `json:"last_seen"`

	Plans []*Plan `json:"plans"`
}

// Node represents the statement in each node
type Node struct {
	Address         string `json:"address"`
	SumLatency      int    `json:"sum_latency"`
	ExecCount       int    `json:"exec_count"`
	AvgLatency      int    `json:"avg_latency"`
	MaxLatency      int    `json:"max_latency"`
	AvgMem          int    `json:"avg_mem"`
	SumBackoffTimes int    `json:"sum_backoff_times"`
}

type Plan struct {
	PlanDigest string `json:"digest"`
	Plan       string `json:"content"`
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

func (overview *Overview) AfterFind() (err error) {
	overview.AggSchemas = extractSchemasFromTableNames(overview.AggTableNames)
	return
}

func (detail *Detail) AfterFind() (err error) {
	detail.AggSchemas = extractSchemasFromTableNames(detail.AggTableNames)
	return
}
