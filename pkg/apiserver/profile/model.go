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

package profile

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

// TrackTickInterval is the interval to check the tasks status.
const TrackTickInterval = 2 * time.Second

// TaskState is used to represent the task/task group state.
type TaskState int

// Built-in task state
const (
	TaskStateCreate TaskState = iota
	TaskStateError
	TaskStateCancel

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
	CreateTime  int64     `json:"create_time"`
	FinishTime  int64     `json:"finish_time"`
	Error       string    `json:"error" gorm:"type:text"`
}

func (TaskModel) TableName() string {
	return "profiling_tasks"
}

type TaskGroupModel struct {
	ID           uint      `json:"id" gorm:"primary_key"`
	RunningTasks int       `json:"running_tasks"`
	State        TaskState `json:"state" gorm:"index"`
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
	db     *dbstore.DB
	mu     sync.Mutex
	cancel context.CancelFunc
}

// NewTask creates a new profiling task.
func NewTask(db *dbstore.DB, id uint, component, addr string) *Task {
	return &Task{
		TaskModel: &TaskModel{
			TaskGroupID: id,
			State:       TaskStateCreate,
			Addr:        addr,
			Component:   component,
			CreateTime:  time.Now().Unix(),
		},
		db: db,
		mu: sync.Mutex{},
	}
}

func (t *Task) run(updateCh chan struct{}) {
	ctx, cancel := context.WithCancel(context.Background())
	t.cancel = cancel
	t.mu.Lock()
	t.State = TaskStateRunning
	t.db.Save(t.TaskModel)
	t.mu.Unlock()
	filePrefix := fmt.Sprintf("profile_group_%d_task%d_%s_%s_", t.TaskGroupID, t.ID, t.Component, t.Addr)
	svgFilePath, err := fetchSvg(ctx, t.Component, t.Addr, filePrefix)
	select {
	case <-ctx.Done():
		t.mu.Lock()
		t.State = TaskStateCancel
		t.db.Save(t.TaskModel)
		t.mu.Unlock()
		return
	default:
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	if err != nil {
		t.Error = err.Error()
		t.State = TaskStateError
		t.db.Save(t.TaskModel)
		updateCh <- struct{}{}
		return
	}
	t.FilePath = svgFilePath
	t.State = TaskStateFinish
	t.FinishTime = time.Now().Unix()
	t.db.Save(t.TaskModel)
	updateCh <- struct{}{}
}

func (t *Task) stop() {
	t.cancel()
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.State != TaskStateFinish {
		t.State = TaskStateCancel
		t.db.Save(t.TaskModel)
	}
}

// TaskGroup is the collection of tasks.
type TaskGroup struct {
	*TaskGroupModel
	updateCh chan struct{}
}

// NewTaskGroup create a new profiling task group.
func NewTaskGroup() *TaskGroup {
	return &TaskGroup{
		TaskGroupModel: &TaskGroupModel{
			State: TaskStateCreate,
		},
		updateCh: make(chan struct{}),
	}
}

func (tg *TaskGroup) trackTasks(db *dbstore.DB, taskTacker *sync.Map) {
	trackTicker := time.NewTicker(TrackTickInterval)
	defer trackTicker.Stop()

	log.Info("start to track tasks", zap.Int("total", tg.RunningTasks))
	for {
		select {
		case <-tg.updateCh:
			tg.RunningTasks--
		case <-trackTicker.C:
			if tg.RunningTasks == 0 {
				tg.State = TaskStateFinish
				db.Save(tg.TaskGroupModel)
				close(tg.updateCh)
				return
			}
		}
	}
}
