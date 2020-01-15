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
	"archive/tar"
	"context"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
)

var controller *Controller

func init() {
	controller = NewController("./sqlite.db")
	controller.init()
}

type Controller struct {
	dbPath     string
	db         *DBClient
	taskGroups TaskGroups
}

func NewController(dbPath string) *Controller {
	return &Controller{
		dbPath:     dbPath,
		taskGroups: make(TaskGroups),
	}
}

func (c *Controller) init() error {
	db, err := sql.Open("sqlite3", c.dbPath)
	if err != nil {
		return err
	}
	c.db = NewDBClient(db)
	err = c.db.init()
	if err != nil {
		return err
	}
	err = c.cleanUnfinishedTask()
	if err != nil {
		return err
	}
	return c.loadFinishedTask()
}

func (c *Controller) getAllTasks() ([]*TaskInfo, error) {
	return c.db.queryAllTasks()
}

func (c *Controller) cleanUnfinishedTask() error {
	tasks, err := c.db.queryAllUnfinishedTasks()
	if err != nil {
		return err
	}
	for _, t := range tasks {
		os.RemoveAll(t.SavedPath)
		err = c.db.cleanTask(t.ID)
		if err != nil {
			return err
		}
	}
	return nil
}

func (c *Controller) AddTaskGroup(reqs []*ReqInfo) string {
	taskGroup := NewTaskGroup(reqs, c.db)
	c.taskGroups[taskGroup.id] = taskGroup
	return taskGroup.id
}

func (c *Controller) RunTaskGroup(id string) error {
	tg, ok := c.taskGroups[id]
	if !ok {
		return fmt.Errorf(`task "%s" removed`, tg.id)
	}
	go tg.run(context.Background())
	return nil
}

func (c *Controller) stopTask(taskID string) error {
	for _, taskGroup := range c.taskGroups {
		for id, task := range taskGroup.tasks {
			if id == taskID {
				return task.Abort()
			}
		}
	}
	return fmt.Errorf("task <%s> not found", taskID)
}

func (c *Controller) cleanTask(task *TaskInfo) {
	os.RemoveAll(task.SavedPath)
	controller.db.cleanTask(task.ID)
}

func (c *Controller) stopTaskGroup(taskGroupID string) error {
	tasks, err := c.db.queryTasks(taskGroupID)
	if err != nil {
		return err
	}
	for _, task := range tasks {
		err := c.stopTask(task.ID)
		if err != nil {
			if _, ok := err.(TaskNotRunningError); ok {
				controller.cleanTask(task)
			}
		}
	}
	return fmt.Errorf("task group <%s> not found", taskGroupID)
}

func (c *Controller) dumpClusterLogs(taskGroupID string, w http.ResponseWriter) error {
	tasks, err := c.db.queryTasks(taskGroupID)
	if err != nil {
		return err
	}
	tw := tar.NewWriter(w)
	defer tw.Close()
	for _, task := range tasks {
		f, err := os.Open(task.SavedPath)
		if err != nil {
			return err
		}

		fi, err := f.Stat()
		if err != nil {
			return err
		}
		err = tw.WriteHeader(&tar.Header{
			Name:    path.Base(task.SavedPath),
			Mode:    int64(fi.Mode()),
			ModTime: fi.ModTime(),
			Size:    fi.Size(),
		})
		if err != nil {
			return err
		}

		_, err = io.Copy(tw, f)
		if err != nil {
			return err
		}
	}
	return nil
}

type TaskState string

const (
	StateRunning  TaskState = "running"
	StateCanceled           = "canceled"
	StateFinished           = "finished"
)

func (c *Controller) dumpLog(taskID string, w http.ResponseWriter) error {
	task, err := c.db.queryTaskByID(taskID)
	if err != nil {
		return err
	}

	f, err := os.Open(task.SavedPath)
	if err != nil {
		return err
	}
	_, err = io.Copy(w, f)
	if err != nil {
		return err
	}
	return nil
}

func (c *Controller) loadFinishedTask() error {
	tasks, err := c.db.queryAllFinishedTask()
	if err != nil {
		return err
	}
	for _, task := range tasks {
		taskGroup, ok := c.taskGroups[task.TaskGroupID]
		if !ok {
			taskGroup = &TaskGroup{
				tasks: make(Tasks),
				id:    task.TaskGroupID,
				db:    c.db,
			}
			c.taskGroups[task.TaskGroupID] = taskGroup
		}
		taskGroup.tasks[task.ID] = &Task{
			db:          c.db,
			id:          task.ID,
			taskGroupID: task.TaskGroupID,
			savedPath:   task.SavedPath,
		}
	}
	return nil
}
