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

// TimeRange represents a range of time
type TimeRange struct {
	BeginTime string `json:"begin_time"`
	EndTime   string `json:"end_time"`
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

	QuerySampleText string `json:"query_sample_text"`
	LastSeen        string `json:"last_seen"`
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
