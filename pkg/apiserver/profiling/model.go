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

package profiling

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

// TaskState is used to represent the task/task group state.
type TaskState int

// Built-in task state
const (
	TaskStateError TaskState = iota

	// TaskGroup can only have these two states.
	TaskStateRunning
	TaskStateFinish
)

type TaskModel struct {
	ID          uint                    `json:"id" gorm:"primary_key"`
	TaskGroupID uint                    `json:"task_group_id" gorm:"index"`
	State       TaskState               `json:"state" gorm:"index"`
	Target      utils.RequestTargetNode `json:"target" gorm:"embedded;embedded_prefix:target_"`
	FilePath    string                  `json:"file_path" gorm:"type:text"`
	Error       string                  `json:"error" gorm:"type:text"`
	StartedAt   int64                   `json:"started_at"` // The start running time, reset when retry. Used to estimate approximate profiling progress.
}

func (TaskModel) TableName() string {
	return "profiling_tasks"
}

type TaskGroupModel struct {
	ID                  uint                          `json:"id" gorm:"primary_key"`
	State               TaskState                     `json:"state" gorm:"index"`
	ProfileDurationSecs uint                          `json:"profile_duration_secs"`
	TargetStats         utils.RequestTargetStatistics `json:"target_stats" gorm:"embedded;embedded_prefix:target_stats_"`
	StartedAt           int64                         `json:"started_at"`
}

func (TaskGroupModel) TableName() string {
	return "profiling_task_groups"
}

func autoMigrate(db *dbstore.DB) error {
	return db.AutoMigrate(&TaskModel{}).
		AutoMigrate(&TaskGroupModel{}).
		Error
}

// Task is the unit to fetch profiling information.
type Task struct {
	*TaskModel
	ctx       context.Context
	cancel    context.CancelFunc
	taskGroup *TaskGroup
	tls       bool
}

// NewTask creates a new profiling task.
func NewTask(taskGroup *TaskGroup, target utils.RequestTargetNode, tls bool) *Task {
	ctx, cancel := context.WithCancel(context.Background())
	return &Task{
		TaskModel: &TaskModel{
			TaskGroupID: taskGroup.ID,
			State:       TaskStateRunning,
			Target:      target,
			StartedAt:   time.Now().Unix(),
		},
		ctx:       ctx,
		cancel:    cancel,
		taskGroup: taskGroup,
		tls:       tls,
	}
}

func (t *Task) run(httpClient *http.Client) {
	fileNameWithoutExt := fmt.Sprintf("profiling_%d_%d_%s", t.TaskGroupID, t.ID, t.Target.FileName())
	svgFilePath, err := profileAndWriteSVG(t.ctx, &t.Target, fileNameWithoutExt, t.taskGroup.ProfileDurationSecs, httpClient, t.tls)
	if err != nil {
		t.Error = err.Error()
		t.State = TaskStateError
		t.taskGroup.db.Save(t.TaskModel)
		return
	}
	t.FilePath = svgFilePath
	t.State = TaskStateFinish
	t.taskGroup.db.Save(t.TaskModel)
}

func (t *Task) stop() {
	t.cancel()
}

// TaskGroup is the collection of tasks.
type TaskGroup struct {
	*TaskGroupModel
	db *dbstore.DB
}

// NewTaskGroup create a new profiling task group.
func NewTaskGroup(db *dbstore.DB, profileDurationSecs uint, stats utils.RequestTargetStatistics) *TaskGroup {
	return &TaskGroup{
		TaskGroupModel: &TaskGroupModel{
			State:               TaskStateRunning,
			ProfileDurationSecs: profileDurationSecs,
			TargetStats:         stats,
			StartedAt:           time.Now().Unix(),
		},
		db: db,
	}
}
