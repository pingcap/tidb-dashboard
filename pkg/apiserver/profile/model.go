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

	"github.com/google/uuid"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

// TrackTickInterval is the interval to check the tasks status.
const TrackTickInterval = 2 * time.Second

// TaskState is used to represent the task/task group state.
type TaskState string

// Built-in task state
const (
	Create TaskState = "create"
	Error  TaskState = "error"
	Cancel TaskState = "cancel"

	// TaskGroup can only have these two states.
	Running TaskState = "running"
	Finish  TaskState = "finish"
)

// TaskModel is the model definition of task.
type TaskModel struct {
	ID          string    `json:"task_id"`
	TaskGroupID string    `json:"task_group_id"`
	State       TaskState `json:"state"`
	Addr        string    `json:"address"`
	FilePath    string    `json:"file_path" gorm:"type:text"`
	Component   string    `json:"component"`
	CreateTime  int64     `json:"create_time"`
	FinishTime  int64     `json:"finish_time"`
	Error       string    `json:"error" gorm:"type:text"`
}

// TaskGroupModel is the model definition of task group.
type TaskGroupModel struct {
	ID           string    `json:"task_group_id" `
	RunningTasks int       `json:"running_tasks" `
	State        TaskState `json:"state"`
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
}

// Task is the unit to fetch profiling information.
type Task struct {
	*TaskModel
	db     *dbstore.DB
	mu     sync.Mutex
	cancel context.CancelFunc
}

// NewTask create a new profiling task.
func NewTask(db *dbstore.DB, component, addr, id string) *Task {
	return &Task{
		TaskModel: &TaskModel{
			ID:          uuid.New().String(),
			TaskGroupID: id,
			State:       Create,
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
	t.State = Running
	t.db.Save(t.TaskModel)
	t.mu.Unlock()
	filePrefix := fmt.Sprintf("profile_%s_%s_%s", t.Component, t.Addr, t.ID)
	svgFilePath, err := fetchSvg(ctx, t.Component, t.Addr, filePrefix)
	select {
	case <-ctx.Done():
		t.mu.Lock()
		t.State = Cancel
		t.db.Save(t.TaskModel)
		t.mu.Unlock()
		return
	default:
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	if err != nil {
		t.Error = err.Error()
		t.State = Error
		t.db.Save(t.TaskModel)
		updateCh <- struct{}{}
		return
	}
	t.FilePath = svgFilePath
	t.State = Finish
	t.FinishTime = time.Now().Unix()
	t.db.Save(t.TaskModel)
	updateCh <- struct{}{}
}

func (t *Task) stop() {
	t.cancel()
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.State != Finish {
		t.State = Cancel
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
			ID:    uuid.New().String(),
			State: Create,
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
				tg.State = Finish
				db.Save(tg.TaskGroupModel)
				close(tg.updateCh)
				return
			}
		}
	}
}
