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
	"database/sql"
	"encoding/json"
	"fmt"

	_ "github.com/mattn/go-sqlite3"
	"github.com/pingcap/kvproto/pkg/diagnosticspb"
)

type TaskState string

const (
	StateRunning  TaskState = "running"
	StateCanceled           = "canceled"
	StateFinished           = "finished"
)

var db *DBClient

type DBClient struct {
	db *sql.DB
}

func NewDBClient(db *sql.DB) *DBClient {
	return &DBClient{db: db}
}

func (c *DBClient) init() error {
	_, err := c.db.Exec("CREATE TABLE IF NOT EXISTS task(id TEXT PRIMARY KEY, saved_path TEXT, state TEXT, task_group_id TEXT, request_info TEXT, error TEXT, create_time TEXT, start_time TEXT, stop_time TEXT)")
	if err != nil {
		return err
	}
	_, err = c.db.Exec("CREATE TABLE IF NOT EXISTS preview(id TEXT, time INTERGER, level INTERGER, message TEXT)")
	return err
}

func (c *DBClient) ReplaceTask(task *Task) error {
	requestJSON, err := json.Marshal(task.ReqInfo)
	if err != nil {
		return err
	}
	_, err = c.db.Exec("REPLACE INTO task VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		task.ID,
		task.SavedPath,
		task.State,
		task.TaskGroupID,
		requestJSON,
		task.Error,
		task.CreateTime,
		task.StartTime,
		task.StopTime,
	)
	return err
}

func (c *DBClient) queryTaskByID(taskID string) (*Task, error) {
	task := &Task{}
	var requestJSON string
	rows := c.db.QueryRow("SELECT id, state, saved_path, task_group_id, request_info, error, create_time, start_time, stop_time FROM task WHERE id = ?", taskID)
	err := rows.Scan(&task.ID, &task.State, &task.SavedPath, &task.TaskGroupID, &requestJSON, &task.Error, &task.CreateTime, &task.StartTime, &task.StopTime)
	if err != nil {
		return nil, err
	}
	task.ReqInfo = &ReqInfo{}
	err = json.Unmarshal([]byte(requestJSON), task.ReqInfo)
	return task, err
}

func (c *DBClient) queryTasksWithCondition(condition string) ([]*Task, error) {
	var tasks []*Task
	rows, err := c.db.Query("SELECT id, state, saved_path, task_group_id, request_info, error, create_time, start_time, stop_time FROM task " + condition)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		task := &Task{}
		var requestJSON string
		err := rows.Scan(&task.ID, &task.State, &task.SavedPath, &task.TaskGroupID, &requestJSON, &task.Error, &task.CreateTime, &task.StartTime, &task.StopTime)
		if err != nil {
			return nil, err
		}
		task.ReqInfo = &ReqInfo{}
		err = json.Unmarshal([]byte(requestJSON), task.ReqInfo)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, task)
	}
	return tasks, nil
}

func (c *DBClient) queryAllTasks() ([]*Task, error) {
	return c.queryTasksWithCondition("")
}

func (c *DBClient) cleanAllUnfinishedTasks() error {
	_, err := c.db.Exec("DELETE FROM task WHERE state != ?;", StateFinished)
	return err
}

func (c *DBClient) queryTasks(taskGroupID string) ([]*Task, error) {
	return c.queryTasksWithCondition(fmt.Sprintf(`WHERE task_group_id = "%s"`, taskGroupID))
}

func (c *DBClient) insertLineToPreview(taskID string, l *diagnosticspb.LogMessage) error {
	_, err := c.db.Exec("INSERT INTO preview(id, time, level, message) VALUES (?, ?, ?, ?)", taskID, l.Time, l.Level, l.Message)
	return err
}

func (c *DBClient) previewTask(taskID string) ([]*diagnosticspb.LogMessage, error) {
	lines := make([]*diagnosticspb.LogMessage, 0, PreviewLogLinesLimit)
	rows, err := c.db.Query("SELECT time, level, message FROM preview WHERE id = ?", taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		t := &diagnosticspb.LogMessage{}
		err := rows.Scan(&t.Time, &t.Level, &t.Message)
		if err != nil {
			return nil, err
		}
		lines = append(lines, t)
	}
	return lines, nil
}

func (c *DBClient) cleanPreview(taskID string) error {
	_, err := c.db.Exec("DELETE FROM preview WHERE id = ?", taskID)
	return err
}

func (c *DBClient) cleanTask(taskID string) error {
	_, err := c.db.Exec("DELETE FROM task WHERE id = ?", taskID)
	return err
}
