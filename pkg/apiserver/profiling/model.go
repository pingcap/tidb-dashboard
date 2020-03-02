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
	"time"

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
	ID          uint      `json:"id" gorm:"primary_key"`
	TaskGroupID uint      `json:"task_group_id" gorm:"index"`
	State       TaskState `json:"state" gorm:"index"`
	Addr        string    `json:"address"`
	FilePath    string    `json:"file_path" gorm:"type:text"`
	Component   string    `json:"component"`
	CreatedAt   int64     `json:"created_at"`
	FinishedAt  int64     `json:"finished_at"`
	Error       string    `json:"error" gorm:"type:text"`
}

func (TaskModel) TableName() string {
	return "profiling_tasks"
}

type TaskGroupModel struct {
	ID    uint      `json:"id" gorm:"primary_key"`
	State TaskState `json:"state" gorm:"index"`
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
	ctx          context.Context
	cancel       context.CancelFunc
	db           *dbstore.DB
	grabInterval uint
}

// NewTask creates a new profiling task.
func NewTask(db *dbstore.DB, id, grabInterval uint, component, addr string) *Task {
	return &Task{
		TaskModel: &TaskModel{
			TaskGroupID: id,
			State:       TaskStateRunning,
			Addr:        addr,
			Component:   component,
			CreatedAt:   time.Now().Unix(),
		},
		db:           db,
		grabInterval: grabInterval,
	}
}

func (t *Task) run() {
	filePrefix := fmt.Sprintf("profile_group_%d_task%d_%s_%s_", t.TaskGroupID, t.ID, t.Component, t.Addr)
	svgFilePath, err := fetchSvg(t.ctx, t.Component, t.Addr, filePrefix, t.grabInterval)
	if err != nil {
		t.Error = err.Error()
		t.State = TaskStateError
		t.db.Save(t.TaskModel)
		return
	}
	t.FilePath = svgFilePath
	t.State = TaskStateFinish
	t.FinishedAt = time.Now().Unix()
	t.db.Save(t.TaskModel)
}

func (t *Task) stop() {
	t.cancel()
}

// TaskGroup is the collection of tasks.
type TaskGroup struct {
	*TaskGroupModel
}

// NewTaskGroup create a new profiling task group.
func NewTaskGroup() *TaskGroup {
	return &TaskGroup{
		TaskGroupModel: &TaskGroupModel{
			State: TaskStateRunning,
		},
	}
}
