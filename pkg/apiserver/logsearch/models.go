// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package logsearch

import (
	"database/sql/driver"
	"encoding/json"
	"os"

	"github.com/pingcap/kvproto/pkg/diagnosticspb"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
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

type LogLevel int32

const (
	LogLevelUnknown  LogLevel = 0
	LogLevelDebug    LogLevel = 1
	LogLevelInfo     LogLevel = 2
	LogLevelWarn     LogLevel = 3
	LogLevelTrace    LogLevel = 4
	LogLevelCritical LogLevel = 5
	LogLevelError    LogLevel = 6
)

var PBLogLevelSlice = []diagnosticspb.LogLevel{
	diagnosticspb.LogLevel(LogLevelUnknown),
	diagnosticspb.LogLevel(LogLevelDebug),
	diagnosticspb.LogLevel(LogLevelInfo),
	diagnosticspb.LogLevel(LogLevelWarn),
	diagnosticspb.LogLevel(LogLevelTrace),
	diagnosticspb.LogLevel(LogLevelCritical),
	diagnosticspb.LogLevel(LogLevelError),
}

type SearchLogRequest struct {
	StartTime int64    `json:"start_time"`
	EndTime   int64    `json:"end_time"`
	MinLevel  LogLevel `json:"min_level"`
	// We use a string array to represent multiple CNF pattern sceniaor like:
	// SELECT * FROM t WHERE c LIKE '%s%' and c REGEXP '.*a.*' because
	// Golang and Rust don't support perl-like (?=re1)(?=re2)
	Patterns []string `json:"patterns"`
}

func (r *SearchLogRequest) ConvertToPB(target diagnosticspb.SearchLogRequest_Target) *diagnosticspb.SearchLogRequest {
	levels := PBLogLevelSlice[r.MinLevel:]
	return &diagnosticspb.SearchLogRequest{
		StartTime: r.StartTime,
		EndTime:   r.EndTime,
		Levels:    levels,
		Patterns:  r.Patterns,
		Target:    target,
	}
}

func (r *SearchLogRequest) Scan(src interface{}) error {
	return json.Unmarshal([]byte(src.(string)), r)
}

func (r *SearchLogRequest) Value() (driver.Value, error) {
	val, err := json.Marshal(r)
	return string(val), err
}

type TaskModel struct {
	ID               uint                     `json:"id" gorm:"primary_key"`
	TaskGroupID      uint                     `json:"task_group_id" gorm:"index"`
	Target           *model.RequestTargetNode `json:"target" gorm:"embedded;embedded_prefix:target_"`
	State            TaskState                `json:"state" gorm:"index"`
	LogStorePath     *string                  `json:"log_store_path" gorm:"type:text"`
	SlowLogStorePath *string                  `json:"slow_log_store_path" gorm:"type:text"`
	Size             int64                    `json:"size" gorm:"index"`
	Error            *string                  `json:"error" gorm:"type:text"`
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
	ID            uint                          `json:"id" gorm:"primary_key"`
	SearchRequest *SearchLogRequest             `json:"search_request" gorm:"type:text"`
	State         TaskGroupState                `json:"state" gorm:"index"`
	TargetStats   model.RequestTargetStatistics `json:"target_stats" gorm:"embedded;embedded_prefix:target_stats_"`
	LogStoreDir   *string                       `json:"log_store_dir" gorm:"type:text"`
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
	Level       diagnosticspb.LogLevel `json:"level" gorm:"type:integer" swaggertype:"integer"`
	Message     string                 `json:"message" gorm:"type:text"`
}

func (PreviewModel) TableName() string {
	return "log_previews"
}

func autoMigrate(db *dbstore.DB) error {
	return db.AutoMigrate(&TaskModel{}, &TaskGroupModel{}, &PreviewModel{})
}

func cleanupAllTasks(db *dbstore.DB) {
	var taskGroups []*TaskGroupModel
	db.Find(&taskGroups)
	for _, tg := range taskGroups {
		tg.Delete(db)
	}
}
