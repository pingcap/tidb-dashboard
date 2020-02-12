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
	"github.com/jinzhu/gorm"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

var scheduler *Scheduler

type Scheduler struct {
	taskGroup *TaskGroupModel
	taskMap   sync.Map
	db        *dbstore.DB
}

func NewScheduler(taskGroup *TaskGroupModel, db *dbstore.DB) *Scheduler {
	return &Scheduler{
		taskGroup: taskGroup,
		taskMap:   sync.Map{},
		db:        db,
	}
}

func loadLatestTaskGroup(db *dbstore.DB) *TaskGroupModel {
	var task TaskModel
	var taskGroup TaskGroupModel
	err := db.Order("create_time desc").First(&task).Error
	if err == gorm.ErrRecordNotFound {
		return nil
	}
	err = db.Where("id = ?", task.TaskGroupID).First(&taskGroup).Error
	if err == gorm.ErrRecordNotFound {
		return nil
	}
	return &taskGroup
}

func (s *Scheduler) fillTasks(taskGroup *TaskGroupModel) {
	if taskGroup == nil {
		return
	}
	var taskModels []TaskModel
	s.db.Where("task_group_id = ?", taskGroup.ID).Find(&taskModels)
	for _, taskModel := range taskModels {
		s.storeTask(toTask(taskModel, s.db))
	}
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

func (s *Scheduler) addTasks(components []*Component, req *SearchLogRequest) {
	taskGroupID := uuid.New().String()
	s.taskMap = sync.Map{}
	s.taskGroup = &TaskGroupModel{
		ID:      taskGroupID,
		Request: req,
	}
	for _, component := range components {
		task := NewTask(s.db, component, taskGroupID, req)
		s.storeTask(task)
	}
}

func (s *Scheduler) runTaskGroup(retryFailedTasks bool) (err error) {
	if s.taskGroup == nil {
		err = fmt.Errorf("no task group in scheduler")
		return
	}
	var taskGroupModel TaskGroupModel
	if retryFailedTasks {
		if s.taskGroup.State != StateCanceled {
			err = fmt.Errorf("cannot retry, task group is %s", s.taskGroup.State)
			return
		}
		s.taskGroup.State = StateRunning
		s.db.Save(s.taskGroup)
	} else {
		if s.taskGroup.State != "" {
			err = fmt.Errorf("cannot start, task group is %s", s.taskGroup.State)
			return
		}
		s.taskGroup.State = StateRunning
		s.db.Create(s.taskGroup)
	}
	go func() {
		wg := sync.WaitGroup{}
		s.taskMap.Range(func(key, value interface{}) bool {
			task, ok := value.(*Task)
			if !ok {
				err = fmt.Errorf("cannot load %+v as *Task", value)
				return false
			}
			if task.TaskGroupID != s.taskGroup.ID {
				err = fmt.Errorf("cannot start, task [%s] is belong to taskGroup [%s], not taskGroup [%s]", task.ID, task.TaskGroupID, s.taskGroup.ID)
				return false
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
		taskGroupModel.State = StateFinished
		s.db.Save(&taskGroupModel)
	}()
	return
}

// abortRunningTasks abort all running tasks
func (s *Scheduler) abortRunningTasks() (err error) {
	s.taskMap.Range(func(key, value interface{}) bool {
		task, ok := value.(*Task)
		if !ok {
			err = fmt.Errorf("cannot load %+v as *Task", value)
			return true
		}
		if task.State == StateRunning {
			task.Abort() //nolint:errcheck
		}
		return true
	})
	return
}
