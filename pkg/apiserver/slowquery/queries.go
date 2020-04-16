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
	"github.com/jinzhu/gorm"
	"strings"
	"time"
)

const (
	MysqlTimeLayout = "2006-01-02 15:04:05.999999"
	SlowQueryTable = "INFORMATION_SCHEMA.CLUSTER_SLOW_QUERY"
)

type Base struct {
	// list filed
	Instance  string    `gorm:"column:INSTANCE" json:"instance"`
	Query     string    `gorm:"column:Query" json:"query"`
	Time      time.Time `gorm:"column:Time" json:"-"`
	Timestamp int64     `json:"timestamp"`
	QueryTime float64   `gorm:"column:Query_time" json:"query_time"`
	MemoryMax int       `gorm:"column:Mem_max" json:"memory_max"`
	Digest    string    `gorm:"column:Digest" json:"digest"`
	ConnectionID uint   `gorm:"column:Conn_ID" json:"connection_id"`
}

type SlowQuery struct {
	*Base `gorm:"embedded"`

	// Detail
	PrevStmt string `gorm:"column:Prev_stmt"json:"prev_stmt"`
	Plan     string `gorm:"column:Plan" json:"plan"`

	// Base - field
	IsInternal int    `gorm:"column:Is_internal" json:"is_internal"`
	Success    int    `gorm:"column:Succ" json:"success"`
	DB         string `gorm:"column:DB" json:"db"`

	// Phase
	ParseTime   float64 `gorm:"column:Parse_time" json:"parse_time"`
	CompileTime float64 `gorm:"column:Compile_time" json:"compile_time"`
	ProcessTime float64 `gorm:"column:Process_time" json:"process_time"`
	WaitTime    float64 `gorm:"column:Wait_time" json:"wait_time"`
	BackoffTime float64 `gorm:"column:Backoff_time" json:"backoff_time"`

	// Connection
	User         string `gorm:"column:User" json:"user"`
	Host         string `gorm:"column:Host" json:"host"`

	// Transaction
	TxnStartTS         uint    `gorm:"column:Txn_start_ts" json:"txn_start_ts"`
	PrewriteTime       float64 `gorm:"column:Prewrite_time" json:"prewrite_time"`
	CommitTime         float64 `gorm:"column:Commit_time" json:"commit_time"`
	GetCommitTSTime    float64 `gorm:"column:Get_commit_ts_time" json:"get_commit_ts_time"`
	LocalLatchWaitTime float64 `gorm:"column:Local_latch_wait_time" json:"local_latch_wait_time"`
	WriteKeys          int     `gorm:"column:Write_keys" json:"write_keys"`
	WriteSize          int     `gorm:"column:Write_size" json:"write_size"`
	PrewriteRegion     int     `gorm:"column:Prewrite_region" json:"prewrite_region"`

	// Coprocessor
	RequestCount uint    `gorm:"column:Request_count" json:"request_count"`
	TotalKeys    uint    `gorm:"column:Total_keys" json:"total_keys"`
	ProcessKeys  uint    `gorm:"column:Process_keys" json:"process_keys"`
	CopProcAvg   float64 `gorm:"column:Cop_proc_avg" json:"cop_proc_avg"`
	CopProcP90   float64 `gorm:"column:Cop_proc_p90" json:"cop_proc_p90"`
	CopProcMax   float64 `gorm:"column:Cop_proc_max" json:"cop_proc_max"`
	CopProcAddr  string  `gorm:"column:Cop_proc_addr" json:"cop_proc_addr"`
	CopWaitAvg   float64 `gorm:"column:Cop_wait_avg" json:"cop_wait_avg"`
	CopWaitP90   float64 `gorm:"column:Cop_wait_p90" json:"cop_wait_p90"`
	CopWaitMax   float64 `gorm:"column:Cop_wait_max" json:"cop_wait_max"`
	CopWaitAddr  string  `gorm:"column:Cop_wait_addr" json:"cop_wait_addr"`
}

func (b *Base) AfterFind() (err error) {
	if !b.Time.IsZero() {
		b.Timestamp = b.Time.UnixNano()
	}
	return
}

type QueryRequestParam struct {
	LogStartTS int64
	LogEndTS   int64
	DB         string
	Limit      int
	Text       string
	OrderBy    string
	DESC       bool
}

func QuerySlowLogList(db *gorm.DB, params *QueryRequestParam) ([]Base, error) {
	var conditions []string
	timeRange := fmt.Sprintf("time between from_unixtime(%d) and from_unixtime(%d)", params.LogStartTS, params.LogEndTS)
	conditions = append(conditions, timeRange)
	if params.Text != "" {
		textMatch := fmt.Sprintf(`(txn_start_ts REGEXP '%[1]s' OR digest REGEXP '%[1]s' OR prev_stmt REGEXP '%[1]s' OR query REGEXP '%[1]s')`,
			params.Text,
		)
		conditions = append(conditions, textMatch)
	}
	if params.DB != "" {
		conditions = append(conditions, "DB = "+params.DB)
	}

	order := params.OrderBy
	if params.DESC {
		order += " desc"
	} else {
		order += " asc"
	}

	var results []Base

	err := db.Table(SlowQueryTable).
		Where(strings.Join(conditions, " AND ")).
		Order(order).
		Limit(params.Limit).
		Find(&results).Error
	if err != nil {
		return nil, err
	}
	return results, nil
}



func QuerySlowLogDetail(db *gorm.DB, request *DetailRequest) (*SlowQuery, error){
	var result SlowQuery

	err := db.Table(SlowQueryTable).
		// TODO: use params here
		First(&result).Error
	if err != nil {
		return nil, err
	}

	return &result, nil
}
