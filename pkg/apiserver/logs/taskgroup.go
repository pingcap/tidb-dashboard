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

package logs

import (
	"context"
	"sync"

	"github.com/google/uuid"
)

// TODO: use sync.Map here
type TaskGroups map[string]*TaskGroup

type TaskGroup struct {
	tasks    Tasks
	id       string
	db       *DBClient
	finished bool
}

func NewTaskGroup(reqs []*ReqInfo, db *DBClient) *TaskGroup {
	taskGroupID := uuid.New().String()
	tasks := make(Tasks, len(reqs))
	for _, req := range reqs {
		task := NewTask(req, db, taskGroupID)
		tasks[task.id] = task
	}
	return &TaskGroup{
		tasks: tasks,
		id:    taskGroupID,
		db:    db,
	}
}

func (tg *TaskGroup) Abort() {
	for _, task := range tg.tasks {
		task.Abort()
	}
}

func (tg *TaskGroup) run(ctx context.Context) {
	wg := sync.WaitGroup{}
	for _, task := range tg.tasks {
		wg.Add(1)
		go task.run(ctx)
	}
	wg.Wait()
	// TODO: notify client fetch tasks finished
}
