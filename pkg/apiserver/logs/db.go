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
	"database/sql"
	"fmt"
	_ "github.com/mattn/go-sqlite3"
	"github.com/pingcap/kvproto/pkg/diagnosticspb"
)

type DBClient struct {
	db *sql.DB
}

func NewDBClient(db *sql.DB) *DBClient {
	return &DBClient{db: db}
}

func (c *DBClient) init() error {
	_, err := c.db.Exec("create table if not exists task(id text primary key, saved_path text, state text, task_group_id text)")
	if err != nil {
		return err
	}
	_, err = c.db.Exec("create table if not exists preview(id text, time interger, level interger, message text)")
	return err
}

type TaskInfo struct {
	ID          string    `json:"id"`
	State       TaskState `json:"state"`
	SavedPath   string    `json:"saved_path"`
	TaskGroupID string    `json:"task_group_id"`
}

func (c *DBClient) queryTaskByID(taskID string) (*TaskInfo, error) {
	t := &TaskInfo{}
	rows := c.db.QueryRow("select id, state, saved_path, task_group_id from task where id = ?", taskID)
	err := rows.Scan(&t.ID, &t.State, &t.SavedPath, &t.TaskGroupID)
	return t, err
}

func (c *DBClient) queryTasksWithSQL(sql string) ([]*TaskInfo, error) {
	var tasks []*TaskInfo
	rows, err := c.db.Query(sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		t := &TaskInfo{}
		err := rows.Scan(&t.ID, &t.SavedPath, &t.State, &t.TaskGroupID)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	return tasks, nil
}

func (c *DBClient) queryAllTasks() ([]*TaskInfo, error) {
	return c.queryTasksWithSQL("select id, saved_path, state, task_group_id from task")
}

func (c *DBClient) queryAllFinishedTask() ([]*TaskInfo, error) {
	sqlStr := fmt.Sprintf(`select id, saved_path, state, task_group_id from task where state = "%s";`, StateFinished)
	return c.queryTasksWithSQL(sqlStr)
}

func (c *DBClient) queryAllUnfinishedTasks() ([]*TaskInfo, error) {
	sqlStr := fmt.Sprintf(`select id, saved_path, state, task_group_id from task where state != "%s";`, StateFinished)
	return c.queryTasksWithSQL(sqlStr)
}

func (c *DBClient) queryTasks(taskGroupID string) ([]*TaskInfo, error) {
	var taskInfos []*TaskInfo
	rows, err := c.db.Query("select id, state, saved_path from task where task_group_id = ?", taskGroupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		t := TaskInfo{}
		err := rows.Scan(&t.ID, &t.State, &t.SavedPath)
		if err != nil {
			return nil, err
		}
		taskInfos = append(taskInfos, t)
	}
	return taskInfos, nil
}

func (c *DBClient) startTask(taskID, savedPath, taskGroupID string) error {
	_, err := c.db.Exec("insert into task(id, saved_path, state, task_group_id) values (?, ?, ?, ?)", taskID, savedPath, StateRunning, taskGroupID)
	return err
}

func (c *DBClient) cancelTask(taskID string) error {
	_, err := c.db.Exec("update task set state = ? where id = ?", StateCanceled, taskID)
	if err != nil {
		return err
	}
	_, err = c.db.Exec("delete from preview where id == ?", taskID)
	return err
}

func (c *DBClient) finishTask(taskID string) error {
	_, err := c.db.Exec("update task set state = ? where id = ?", StateFinished, taskID)
	return err
}

func (c *DBClient) insertLineToPreview(taskID string, l *diagnosticspb.LogMessage) error {
	_, err := c.db.Exec("insert into preview(id, time, level, message) values (?, ?, ?, ?)", taskID, l.Time, l.Level, l.Message)
	return err
}

func (c *DBClient) previewTask(taskID string) ([]*diagnosticspb.LogMessage, error) {
	lines := make([]*diagnosticspb.LogMessage, PreviewLogLinesLimit)
	rows, err := c.db.Query("select time, level, message from preview where id = ?", taskID)
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

func (c *DBClient) cleanTask(taskID string) error {
	_, err := c.db.Exec("delete from task where id == ?", taskID)
	if err != nil {
		return err
	}
	_, err = c.db.Exec("delete from preview where id == ?", taskID)
	return err
}
