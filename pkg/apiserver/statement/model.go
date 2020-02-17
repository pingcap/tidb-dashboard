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

// StatementOverview represents the overview of a statement
type StatementOverview struct {
	SchemaName      string `json:"schema_name"`
	Digest          string `json:"digest"`
	DigestText      string `json:"digest_text"`
	SumLatency      int    `json:"sum_latency"`
	ExecCount       int    `json:"exec_count"`
	AvgAffectedRows int    `json:"avg_affected_rows"`
	AvgLatency      int    `json:"avg_latency"`
	AvgMem          int    `json:"avg_mem"`
}

// StatementDetail represents the detail of a statement
type StatementDetail struct {
	SchemaName      string `json:"schema_name"`
	Digest          string `json:"digest"`
	DigestText      string `json:"digest_text"`
	SumLatency      int    `json:"sum_latency"`
	ExecCount       int    `json:"exec_count"`
	AvgAffectedRows int    `json:"avg_affected_rows"`
	AvgTotalKeys    int    `json:"avg_total_keys"`

	QuerySampleText string `json:"query_sample_text"`
	LastSeen        string `json:"last_seen"`
}

// StatementNode represents the statement in each node
type StatementNode struct {
	Address         string `json:"address"`
	SumLatency      int    `json:"sum_latency"`
	ExecCount       int    `json:"exec_count"`
	AvgLatency      int    `json:"avg_latency"`
	MaxLatency      int    `json:"max_latency"`
	AvgMem          int    `json:"avg_mem"`
	SumBackoffTimes int    `json:"sum_backoff_times"`
}
