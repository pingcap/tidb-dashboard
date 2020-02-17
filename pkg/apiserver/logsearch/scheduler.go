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
	"github.com/pingcap/log"

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

func (s *Scheduler) deleteTask(taskID string) {
	s.taskMap.Delete(taskID)
}

func (s *Scheduler) storeTask(task *Task) {
	s.taskMap.Store(task.ID, task)
}

func (s *Scheduler) loadFailedTasks(taskGroupID string) {
	taskModels := make([]TaskModel, 0)
	s.db.Where("task_group_id = ?", taskGroupID).Find(&taskModels)
	for _, taskModel := range taskModels {
		if taskModel.State == StateCanceled {
			s.storeTask(toTask(taskModel, s.db))
		}
	}
}

func (s *Scheduler) addTasks(components []Component, req SearchLogRequest) *TaskGroupModel {
	taskGroupID := uuid.New().String()
	taskGroup := &TaskGroupModel{
		ID:      taskGroupID,
		Request: &req,
	}
	for _, component := range components {
		task := NewTask(s.db, component, taskGroupID, req)
		s.storeTask(task)
	}
	return taskGroup
}

// deleteTasks delete all tasks in a taskGroups
func (s *Scheduler) deleteTasks(taskGroupID string) {
	s.taskMap.Range(func(key, value interface{}) bool {
		task, ok := value.(*Task)
		if !ok {
			log.Warn(fmt.Sprintf("cannot load %+v as *Task", value))
			return true
		}
		if task.TaskGroupID != taskGroupID {
			return true
		}
		s.deleteTask(task.ID)
		return true
	})
}

func (s *Scheduler) runTaskGroup(taskGroup *TaskGroupModel, retryFailedTasks bool) error {
	if retryFailedTasks {
		if taskGroup.State != StateCanceled {
			return fmt.Errorf("cannot retry, task group is %s", taskGroup.State)
		}
		taskGroup.State = StateRunning
		s.db.Save(taskGroup)
	} else {
		if taskGroup.State != "" {
			return fmt.Errorf("cannot start, task group is %s", taskGroup.State)
		}
		taskGroup.State = StateRunning
		s.db.Create(taskGroup)
	}
	go func() {
		wg := sync.WaitGroup{}
		s.taskMap.Range(func(key, value interface{}) bool {
			task, ok := value.(*Task)
			if !ok {
				log.Warn(fmt.Sprintf("cannot load %+v as *Task", value))
				return true
			}
			if task.TaskGroupID != taskGroup.ID {
				return true
			}
			if retryFailedTasks {
				if task.State != StateCanceled {
					return true
				}
			} else {
				if task.State != "" {
					return true
				}
			}
			wg.Add(1)
			go func() {
				task.run()
				wg.Done()
			}()
			return true
		})
		wg.Wait()
		taskGroup.State = StateFinished
		s.db.Save(taskGroup)
		s.deleteTasks(taskGroup.ID)
	}()
	return nil
}

// abortTaskGroup abort all running tasks in a task group
// This function waits util all tasked aborted, and then return
func (s *Scheduler) abortTaskGroup(taskGroupID string) {
	s.taskMap.Range(func(key, value interface{}) bool {
		task, ok := value.(*Task)
		if !ok {
			log.Warn(fmt.Sprintf("cannot load %+v as *Task", value))
			return true
		}
		if task.TaskGroupID != taskGroupID {
			return true
		}
		if task.State == StateRunning {
			task.Abort() //nolint:errcheck
		}
		return true
	})
}
