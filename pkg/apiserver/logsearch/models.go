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

package logsearch

import (
	"database/sql/driver"
	"encoding/json"

	"github.com/jinzhu/gorm"
	"github.com/pingcap/kvproto/pkg/diagnosticspb"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

type TaskState string

const (
	StateRunning  TaskState = "running"
	StateCanceled TaskState = "canceled"
	StateFinished TaskState = "finished"
)

type SearchLogRequest diagnosticspb.SearchLogRequest

func (r *SearchLogRequest) Scan(src interface{}) error {
	return json.Unmarshal([]byte(src.(string)), r)
}

func (r *SearchLogRequest) Value() (driver.Value, error) {
	val, err := json.Marshal(r)
	return string(val), err
}

type Component struct {
	ServerType string `json:"server_type"`
	IP         string `json:"ip"`
	Port       string `json:"port"`
	StatusPort string `json:"status_port"`
}

type TaskModel struct {
	gorm.Model  `json:"-"`
	TaskID      string            `json:"task_id" gorm:"unique_index"`
	Component   *Component        `json:"component" gorm:"embedded"`
	Request     *SearchLogRequest `json:"request" gorm:"type:text"`
	State       TaskState         `json:"state"`
	SavedPath   string            `json:"saved_path"`
	TaskGroupID string            `json:"task_group_id"`
	Error       string            `json:"error"`
	CreateTime  int64             `json:"create_time"`
	StartTime   int64             `json:"start_time"`
	StopTime    int64             `json:"stop_time"`
}

type TaskGroupModel struct {
	gorm.Model  `json:"-"`
	TaskGroupID string
	Request     *SearchLogRequest `json:"request" gorm:"type:text"`
	//state       TaskState
}

type PreviewModel struct {
	gorm.Model `json:"-"`
	TaskID     string                    `json:"task_id"`
	Message    *diagnosticspb.LogMessage `json:"message" gorm:"embedded"`
}

func initModel(db *dbstore.DB) {
	db.AutoMigrate(&TaskModel{})
	db.AutoMigrate(&TaskGroupModel{})
	db.AutoMigrate(&PreviewModel{})
}
