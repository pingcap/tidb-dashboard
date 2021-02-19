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

package slowquery

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/jinzhu/gorm"
	"github.com/thoas/go-funk"
)

const (
	SlowQueryTable = "INFORMATION_SCHEMA.CLUSTER_SLOW_QUERY"
	SelectStmt     = "*, (UNIX_TIMESTAMP(Time) + 0E0) AS timestamp"
)

type SlowQuery struct {
	Digest string `gorm:"column:Digest" json:"digest"`
	Query  string `gorm:"column:Query" json:"query"`

	Instance string `gorm:"column:INSTANCE" json:"instance"`
	DB       string `gorm:"column:DB" json:"db"`
	// TODO: Switch back to uint64 when modern browser as well as Swagger handles BigInt well.
	ConnectionID string `gorm:"column:Conn_ID" json:"connection_id"`
	Success      int    `gorm:"column:Succ" json:"success"`

	Timestamp             float64 `gorm:"column:timestamp" proj:"(UNIX_TIMESTAMP(Time) + 0E0)" json:"timestamp"` // finish time
	QueryTime             float64 `gorm:"column:Query_time" json:"query_time"`                                   // latency
	ParseTime             float64 `gorm:"column:Parse_time" json:"parse_time"`
	CompileTime           float64 `gorm:"column:Compile_time" json:"compile_time"`
	RewriteTime           float64 `gorm:"column:Rewrite_time" json:"rewrite_time"`
	PreprocSubqueriesTime float64 `gorm:"column:Preproc_subqueries_time" json:"preproc_subqueries_time"`
	OptimizeTime          float64 `gorm:"column:Optimize_time" json:"optimize_time"`
	WaitTSTime            float64 `gorm:"column:Wait_TS" json:"wait_ts"`
	CopTime               float64 `gorm:"column:Cop_time" json:"cop_time"`
	LockKeysTime          float64 `gorm:"column:LockKeys_time" json:"lock_keys_time"`
	WriteRespTime         float64 `gorm:"column:Write_sql_response_total" json:"write_sql_response_total"`
	ExecRetryTime         float64 `gorm:"column:Exec_retry_time" json:"exec_retry_time"`

	MemoryMax int `gorm:"column:Mem_max" json:"memory_max"`
	DiskMax   int `gorm:"column:Disk_max" json:"disk_max"`
	// TODO: Switch back to uint64 when modern browser as well as Swagger handles BigInt well.
	TxnStartTS string `gorm:"column:Txn_start_ts" json:"txn_start_ts"`

	// Detail
	PrevStmt string `gorm:"column:Prev_stmt" json:"prev_stmt"`
	Plan     string `gorm:"column:Plan" json:"plan"`

	// Basic
	IsInternal   int    `gorm:"column:Is_internal" json:"is_internal"`
	IndexNames   string `gorm:"column:Index_names" json:"index_names"`
	Stats        string `gorm:"column:Stats" json:"stats"`
	BackoffTypes string `gorm:"column:Backoff_types" json:"backoff_types"`

	// Connection
	User string `gorm:"column:User" json:"user"`
	Host string `gorm:"column:Host" json:"host"`

	// Time
	ProcessTime            float64 `gorm:"column:Process_time" json:"process_time"`
	WaitTime               float64 `gorm:"column:Wait_time" json:"wait_time"`
	BackoffTime            float64 `gorm:"column:Backoff_time" json:"backoff_time"`
	GetCommitTSTime        float64 `gorm:"column:Get_commit_ts_time" json:"get_commit_ts_time"`
	LocalLatchWaitTime     float64 `gorm:"column:Local_latch_wait_time" json:"local_latch_wait_time"`
	ResolveLockTime        float64 `gorm:"column:Resolve_lock_time" json:"resolve_lock_time"`
	PrewriteTime           float64 `gorm:"column:Prewrite_time" json:"prewrite_time"`
	WaitPreWriteBinlogTime float64 `gorm:"column:Wait_prewrite_binlog_time" json:"wait_prewrite_binlog_time"`
	CommitTime             float64 `gorm:"column:Commit_time" json:"commit_time"`
	CommitBackoffTime      float64 `gorm:"column:Commit_backoff_time" json:"commit_backoff_time"`
	CopProcAvg             float64 `gorm:"column:Cop_proc_avg" json:"cop_proc_avg"`
	CopProcP90             float64 `gorm:"column:Cop_proc_p90" json:"cop_proc_p90"`
	CopProcMax             float64 `gorm:"column:Cop_proc_max" json:"cop_proc_max"`
	CopWaitAvg             float64 `gorm:"column:Cop_wait_avg" json:"cop_wait_avg"`
	CopWaitP90             float64 `gorm:"column:Cop_wait_p90" json:"cop_wait_p90"`
	CopWaitMax             float64 `gorm:"column:Cop_wait_max" json:"cop_wait_max"`

	// Transaction
	WriteKeys      int `gorm:"column:Write_keys" json:"write_keys"`
	WriteSize      int `gorm:"column:Write_size" json:"write_size"`
	PrewriteRegion int `gorm:"column:Prewrite_region" json:"prewrite_region"`
	TxnRetry       int `gorm:"column:Txn_retry" json:"txn_retry"`

	// Coprocessor
	RequestCount uint   `gorm:"column:Request_count" json:"request_count"`
	ProcessKeys  uint   `gorm:"column:Process_keys" json:"process_keys"`
	TotalKeys    uint   `gorm:"column:Total_keys" json:"total_keys"`
	CopProcAddr  string `gorm:"column:Cop_proc_addr" json:"cop_proc_addr"`
	CopWaitAddr  string `gorm:"column:Cop_wait_addr" json:"cop_wait_addr"`

	// Tracing
	// TODO: Switch back to uint64 when modern browser as well as Swagger handles BigInt well.
	TraceID string `gorm:"column:Trace_ID" json:"trace_id"`
}

type GetListRequest struct {
	BeginTime int      `json:"begin_time" form:"begin_time"`
	EndTime   int      `json:"end_time" form:"end_time"`
	DB        []string `json:"db" form:"db"`
	Limit     uint     `json:"limit" form:"limit"`
	Text      string   `json:"text" form:"text"`
	OrderBy   string   `json:"orderBy" form:"orderBy"`
	IsDesc    bool     `json:"desc" form:"desc"`

	// for showing slow queries in the statement detail page
	Plans  []string `json:"plans" form:"plans"`
	Digest string   `json:"digest" form:"digest"`

	Fields string `json:"fields" form:"fields"` // example: "Query,Digest"
}

var cachedProjectionsMap map[string]string

func getProjectionsMap() map[string]string {
	if cachedProjectionsMap == nil {
		t := reflect.TypeOf(SlowQuery{})
		fieldsNum := t.NumField()
		ret := map[string]string{}
		for i := 0; i < fieldsNum; i++ {
			field := t.Field(i)
			// ignore to check error because the field is defined by ourself
			// we can confirm that it has "gorm" tag and fixed structure
			s, _ := field.Tag.Lookup("gorm")
			jsonField := strings.ToLower(field.Tag.Get("json"))
			sourceField := strings.Split(s, ":")[1]
			if proj, ok := field.Tag.Lookup("proj"); ok {
				ret[jsonField] = fmt.Sprintf("%s AS %s", proj, sourceField)
			} else {
				ret[jsonField] = sourceField
			}
		}
		cachedProjectionsMap = ret
	}
	return cachedProjectionsMap
}

func getProjectionsByFields(jsonFields ...string) ([]string, error) {
	projMap := getProjectionsMap()
	ret := make([]string, 0, len(jsonFields))
	for _, fieldName := range jsonFields {
		field, ok := projMap[strings.ToLower(fieldName)]
		if !ok {
			return nil, fmt.Errorf("unknown field %s", fieldName)
		}
		ret = append(ret, field)
	}
	return ret, nil
}

var cachedAllProjections []string

func getAllProjections() []string {
	if cachedAllProjections == nil {
		projMap := getProjectionsMap()
		ret := make([]string, 0, len(projMap))
		for _, proj := range projMap {
			ret = append(ret, proj)
		}
		cachedAllProjections = ret
	}
	return cachedAllProjections
}

type GetDetailRequest struct {
	Digest    string  `json:"digest" form:"digest"`
	Timestamp float64 `json:"timestamp" form:"timestamp"`
	// TODO: Switch back to uint64 when modern browser as well as Swagger handles BigInt well.
	ConnectID string `json:"connect_id" form:"connect_id"`
}

func QuerySlowLogList(db *gorm.DB, req *GetListRequest) ([]SlowQuery, error) {
	var projections []string
	var err error
	reqFields := strings.Split(req.Fields, ",")
	if len(reqFields) == 1 && reqFields[0] == "*" {
		projections = getAllProjections()
	} else {
		projections, err = getProjectionsByFields(
			funk.UniqString(
				append([]string{"digest", "connection_id", "timestamp"}, reqFields...),
			)...)
		if err != nil {
			return nil, err
		}
	}

	tx := db.
		Table(SlowQueryTable).
		Select(strings.Join(projections, ", ")).
		Where("Time BETWEEN FROM_UNIXTIME(?) AND FROM_UNIXTIME(?)", req.BeginTime, req.EndTime)

	if req.Limit > 0 {
		tx = tx.Limit(req.Limit)
	}

	if req.Text != "" {
		lowerStr := strings.ToLower(req.Text)
		arr := strings.Fields(lowerStr)
		for _, v := range arr {
			tx = tx.Where(
				`Txn_start_ts REGEXP ?
				 OR LOWER(Digest) REGEXP ?
				 OR LOWER(CONVERT(Prev_stmt USING utf8)) REGEXP ?
				 OR LOWER(CONVERT(Query USING utf8)) REGEXP ?`,
				v, v, v, v,
			)
		}
	}

	if len(req.DB) > 0 {
		tx = tx.Where("DB IN (?)", req.DB)
	}

	// more robust
	if req.OrderBy == "" {
		req.OrderBy = "timestamp"
	}

	order, err := getProjectionsByFields(req.OrderBy)
	if err != nil {
		return nil, err
	}
	// to handle the special case: timestamp
	// if req.OrderBy is "timestamp", then the order is "(unix_timestamp(Time) + 0E0) AS timestamp"
	if strings.Contains(order[0], " AS ") {
		order[0] = req.OrderBy
	}
	if order[0] == "timestamp" {
		// Order by column instead of expression, see related optimization in TiDB: https://github.com/pingcap/tidb/pull/20750
		order[0] = "Time"
	}

	if req.IsDesc {
		tx = tx.Order(fmt.Sprintf("%s DESC", order[0]))
	} else {
		tx = tx.Order(fmt.Sprintf("%s ASC", order[0]))
	}

	if len(req.Plans) > 0 {
		tx = tx.Where("Plan_digest IN (?)", req.Plans)
	}

	if len(req.Digest) > 0 {
		tx = tx.Where("Digest = ?", req.Digest)
	}

	var results []SlowQuery
	err = tx.Find(&results).Error
	if err != nil {
		return nil, err
	}
	return results, nil
}

func QuerySlowLogDetail(db *gorm.DB, req *GetDetailRequest) (*SlowQuery, error) {
	var result SlowQuery
	err := db.
		Table(SlowQueryTable).
		Select(SelectStmt).
		Where("Digest = ?", req.Digest).
		Where("Time = FROM_UNIXTIME(?)", req.Timestamp).
		Where("Conn_id = ?", req.ConnectID).
		First(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}
