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
	"fmt"
	"os"
	"strings"

	"github.com/pingcap/kvproto/pkg/diagnosticspb"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

type TaskState int

const (
	TaskStateRunning  TaskState = 1
	TaskStateFinished TaskState = 2
	TaskStateError    TaskState = 3
)

type TaskGroupState int

const (
	TaskGroupStateRunning  TaskGroupState = 1
	TaskGroupStateFinished TaskGroupState = 2
)

type SearchLogRequest diagnosticspb.SearchLogRequest

func (r *SearchLogRequest) Scan(src interface{}) error {
	return json.Unmarshal([]byte(src.(string)), r)
}

func (r *SearchLogRequest) Value() (driver.Value, error) {
	val, err := json.Marshal(r)
	return string(val), err
}

type SearchTarget struct {
	Kind string `json:"kind" gorm:"size:10" example:"tidb"`
	IP   string `json:"ip" gorm:"size:32" example:"127.0.0.1"`
	Port int    `json:"port" example:"10080"`
}

func (s *SearchTarget) Address() string {
	return fmt.Sprintf("%s:%d", s.IP, s.Port)
}

func (s *SearchTarget) String() string {
	return fmt.Sprintf("%s(%s)", s.Kind, s.Address())
}

func (s *SearchTarget) FileName() string {
	return fmt.Sprintf("%s_%s_%d", s.Kind, strings.ReplaceAll(s.IP, ".", "_"), s.Port)
}

type TaskModel struct {
	ID           uint          `json:"id" gorm:"primary_key"`
	TaskGroupID  uint          `json:"task_group_id" gorm:"index"`
	SearchTarget *SearchTarget `json:"search_target" gorm:"embedded;embedded_prefix:search_target_"`
	State        TaskState     `json:"state" gorm:"index"`
	LogStorePath *string       `json:"log_store_path" gorm:"type:text"`
	Error        *string       `json:"error" gorm:"type:text"`
}

func (TaskModel) TableName() string {
	return "log_search_tasks"
}

// Note: this function does not save model itself.
func (task *TaskModel) RemoveDataAndPreview(db *dbstore.DB) {
	if task.LogStorePath != nil {
		_ = os.RemoveAll(*task.LogStorePath)
		task.LogStorePath = nil
	}
	db.Where("task_id = ?", task.ID).Delete(&PreviewModel{})
}

type TaskGroupModel struct {
	ID            uint              `json:"id" gorm:"primary_key"`
	SearchRequest *SearchLogRequest `json:"search_request" gorm:"type:text"`
	State         TaskGroupState    `json:"state" gorm:"index"`
	LogStoreDir   *string           `json:"log_store_dir" gorm:"type:text"`
}

func (TaskGroupModel) TableName() string {
	return "log_search_task_groups"
}

func (tg *TaskGroupModel) Delete(db *dbstore.DB) {
	if tg.LogStoreDir != nil {
		_ = os.RemoveAll(*tg.LogStoreDir)
	}
	db.Where("task_group_id = ?", tg.ID).Delete(&PreviewModel{})
	db.Where("task_group_id = ?", tg.ID).Delete(&TaskModel{})
	db.Where("id = ?", tg.ID).Delete(&TaskGroupModel{})
}

type PreviewModel struct {
	ID          uint                   `json:"id" grom:"primary_key"`
	TaskID      uint                   `json:"task_id" gorm:"index:task"`
	TaskGroupID uint                   `json:"task_group_id" gorm:"index:task_group"`
	Time        int64                  `json:"time" gorm:"index:task,task_group"`
	Level       diagnosticspb.LogLevel `json:"level" gorm:"type:integer"`
	Message     string                 `json:"message" gorm:"type:text"`
}

func (PreviewModel) TableName() string {
	return "log_previews"
}

func autoMigrate(db *dbstore.DB) error {
	return db.AutoMigrate(&TaskModel{}).
		AutoMigrate(&TaskGroupModel{}).
		AutoMigrate(&PreviewModel{}).
		Error
}

func cleanupAllTasks(db *dbstore.DB) {
	var taskGroups []*TaskGroupModel
	db.Find(&taskGroups)
	for _, tg := range taskGroups {
		tg.Delete(db)
	}
}
