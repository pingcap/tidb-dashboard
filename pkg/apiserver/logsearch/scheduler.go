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
	"sync"

	"github.com/pingcap/log"
	"go.uber.org/zap"
)

const (
	TaskMaxPreviewLines      = 500
	TaskGroupMaxPreviewLines = 5000
)

type Scheduler struct {
	runningTaskGroups sync.Map
	service           *Service
}

func NewScheduler(service *Service) *Scheduler {
	return &Scheduler{
		runningTaskGroups: sync.Map{},
		service:           service,
	}
}

func (s *Scheduler) AsyncStart(taskGroupModel *TaskGroupModel, tasksModel []*TaskModel) bool {
	log.Debug("Scheduler start task group", zap.Uint("task_group_id", taskGroupModel.ID))

	previewsLinesPerTask := TaskGroupMaxPreviewLines / len(tasksModel)
	if previewsLinesPerTask > TaskMaxPreviewLines {
		previewsLinesPerTask = TaskMaxPreviewLines
	}

	taskGroup := &TaskGroup{
		service:                s.service,
		model:                  taskGroupModel,
		tasks:                  nil, // Tasks are created only after successfully adding to the sync map.
		tasksMu:                sync.Mutex{},
		maxPreviewLinesPerTask: previewsLinesPerTask,
	}
	_, alreadyRunning := s.runningTaskGroups.LoadOrStore(taskGroup.model.ID, taskGroup)
	if alreadyRunning {
		log.Warn("Scheduler start task group failed, task group is already running", zap.Uint("task_group_id", taskGroupModel.ID))
		return false
	}

	taskGroup.InitTasks(tasksModel)

	go func() {
		taskGroup.SyncRun()
		s.runningTaskGroups.Delete(taskGroup.model.ID)

		log.Debug("Scheduler task group finished", zap.Uint("task_group_id", taskGroupModel.ID))
	}()

	return true
}

func (s *Scheduler) AsyncAbort(taskGroupID uint) bool {
	log.Debug("Scheduler abort task group", zap.Uint("task_group_id", taskGroupID))

	v, ok := s.runningTaskGroups.Load(taskGroupID)
	if !ok {
		log.Warn("Scheduler abort task group failed, task group is not running", zap.Uint("task_group_id", taskGroupID))
		return false
	}
	taskGroup := v.(*TaskGroup)
	taskGroup.AbortAll()
	return true
}
