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
	"os"

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
	ID          string            `json:"task_id" gorm:"type:char(36);primary_key"`
	TaskGroupID string            `json:"task_group_id" gorm:"type:char(36)"`
	Component   *Component        `json:"component" gorm:"embedded"`
	Request     *SearchLogRequest `json:"request" gorm:"type:text"`
	State       TaskState         `json:"state"`
	SavedPath   string            `json:"saved_path" gorm:"type:text"`
	Error       string            `json:"error" gorm:"type:text"`
	CreateTime  int64             `json:"create_time"`
	StartTime   int64             `json:"start_time"`
	StopTime    int64             `json:"stop_time"`
}

func (TaskModel) TableName() string {
	return "log_search_tasks"
}

type TaskGroupModel struct {
	ID      string            `json:"task_group_id" gorm:"type:char(36);primary_key"`
	Request *SearchLogRequest `json:"request" gorm:"type:text"`
	State   TaskState         `json:"state"`
}

func (TaskGroupModel) TableName() string {
	return "log_search_task_groups"
}

type PreviewModel struct {
	ID          uint                   `json:"-" grom:"primary_key"`
	TaskID      string                 `json:"task_id" gorm:"index;type:char(36)"`
	TaskGroupID string                 `json:"task_group_id" gorm:"index;type:char(36)"`
	Time        int64                  `json:"time" gorm:"index"`
	Level       diagnosticspb.LogLevel `json:"level" gorm:"type:integer"`
	Message     string                 `json:"message" gorm:"type:text"`
}

func (PreviewModel) TableName() string {
	return "log_previews"
}

func autoMigrate(db *dbstore.DB) {
	err := db.AutoMigrate(&TaskModel{}).Error
	if err != nil {
		panic(err)
	}
	err = db.AutoMigrate(&TaskGroupModel{}).Error
	if err != nil {
		panic(err)
	}
	err = db.AutoMigrate(&PreviewModel{}).Error
	if err != nil {
		panic(err)
	}
}

func cleanRunningTasks(db *dbstore.DB) {
	db.Model(&TaskGroupModel{}).Where("state = ?", StateRunning).Update("state", StateCanceled)
	db.Model(&TaskModel{}).Where("state = ?", StateRunning).Update("state", StateCanceled)
	var tasks []TaskModel
	db.Where("state != ?", StateFinished).Find(&tasks)
	for _, task := range tasks {
		if task.SavedPath != "" {
			os.RemoveAll(task.SavedPath) //nolint:errcheck
		}
		db.Where("task_id = ?", task.ID).Delete(&PreviewModel{})
	}
}
