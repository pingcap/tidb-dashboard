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
	"fmt"
	"sync"

	"github.com/google/uuid"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

type Scheduler struct {
	taskMap sync.Map
	db      *dbstore.DB
}

func NewScheduler(db *dbstore.DB) *Scheduler {
	return &Scheduler{
		taskMap: sync.Map{},
		db:      db,
	}
}

var scheduler *Scheduler

func loadTasksFromDB(db *dbstore.DB) ([]*Task, error) {
	var taskModels []TaskModel
	err := db.Find(&taskModels).Error
	if err != nil {
		return nil, err
	}
	tasks := make([]*Task, 0)
	for _, taskModel := range taskModels {
		tasks = append(tasks, toTask(taskModel, db))
	}
	return tasks, nil
}

func (s *Scheduler) abortTaskByID(taskID string) error {
	t := scheduler.loadTask(taskID)
	if t == nil {
		return fmt.Errorf("task [%s] not found", taskID)
	}
	err := t.Abort()
	if err != nil {
		return err
	}
	return nil
}

func (s *Scheduler) loadTask(id string) *Task {
	value, ok := s.taskMap.Load(id)
	if !ok {
		return nil
	}
	return value.(*Task)
}

func (s *Scheduler) storeTask(task *Task) {
	s.taskMap.Store(task.ID, task)
}

func (s *Scheduler) deleteTask(task *Task) error {
	var err error
	if task.State == StateRunning {
		err = s.abortTaskByID(task.TaskID)
		if err != nil {
			return err
		}
	}
	err = task.clean()
	if err != nil {
		return err
	}
	err = s.db.Delete(TaskModel{}, "task_id = ?", task.TaskID).Error
	if err != nil {
		return err
	}
	return nil
}

func (s *Scheduler) addTasks(components []*Component, req *SearchLogRequest) string {
	taskGroupID := uuid.New().String()
	for _, component := range components {
		task := NewTask(s.db, component, taskGroupID, req)
		s.storeTask(task)
	}
	return taskGroupID
}

func (s *Scheduler) runTaskGroup(id string) (err error) {
	s.taskMap.Range(func(key, value interface{}) bool {
		task, ok := value.(*Task)
		if !ok {
			err = fmt.Errorf("cannot load %+v as *Task", value)
			return false
		}
		if task.TaskGroupID == id {
			go task.run()
		}
		return true
	})
	return
}
