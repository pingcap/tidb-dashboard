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
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap/kvproto/pkg/diagnosticspb"
)

const defaultSearchLogDuration = 24 * time.Hour

// @Summary fetch logs
// @Description fetch logs from TiDB, TiKV, PD
// @Accept json
// @Produce json
// @Success 200 {string} string
// @Router /logs [get]
func (s *Service) fetchHandler(c *gin.Context) {
	// TODO: using parameters provided by client
	endTime := time.Now().UnixNano() / int64(time.Millisecond)
	startTime := int64(0)
	var searchLogReq = &diagnosticspb.SearchLogRequest{
		StartTime: startTime,
		EndTime:   endTime,
		Levels:    nil,
		Patterns:  nil,
	}
	var args = []*ReqInfo{
		{
			serverType: "tidb",
			ip:         "127.0.0.1",
			port:       "10080",
			req:        searchLogReq,
		},
	}

	taskGroupID := controller.AddTaskGroup(args)
	err := controller.RunTaskGroup(taskGroupID)
	if err != nil {
		c.String(http.StatusInternalServerError, err.Error())
		return
	}
	c.String(http.StatusOK, taskGroupID)
}

func (s *Service) listAllTasksHandler(c *gin.Context) {
	tasks, err := controller.getAllTasks()
	if err != nil {
		c.String(http.StatusInternalServerError, err.Error())
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func (s *Service) cancelTaskGroupHandler(c *gin.Context) {
	taskGroupID := c.Query("taskGroupID")
	tasks, err := controller.db.queryTasks(taskGroupID)
	if err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}
	var res string
	for _, task := range tasks {
		if task.State != StateRunning {
			res += fmt.Sprintf("task [%s] has been %s\n", task.ID, task.State)
			continue
		}
		err := controller.stopTask(task.ID)
		if err != nil {
			res += fmt.Sprintf("stop task [%s] failed: err=%s\n", task.ID, err.Error())
		}
	}
	c.String(http.StatusOK, res)
}

func (s *Service) cancelTaskHandler(c *gin.Context) {
	taskID := c.Query("taskID")
	err := controller.stopTask(taskID)
	task, err := controller.db.queryTaskByID(taskID)
	if err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}
	if task.State != StateRunning {
		c.String(http.StatusOK, "task [%s] has been %s", taskID, task.State)
	}
	err = controller.stopTask(taskID)
	if err != nil {
		c.String(http.StatusInternalServerError, err.Error())
		return
	}
	c.String(http.StatusOK, "task [%s] canceled", taskID)
}

func (s *Service) deleteTaskGroupHandler(c *gin.Context) {
	taskGroupID := c.Query("taskGroupID")
	tasks, err := controller.db.queryTasks(taskGroupID)
	if err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}
	var res string
	for _, task := range tasks {
		if task.State == StateRunning {
			res += fmt.Sprintf("cannot delete task [%s], task is running\n", task.ID)
			continue
		}
		controller.cleanTask(task)
		res += fmt.Sprintf("task [%s] deleted\n", task.ID)
	}
	c.String(http.StatusOK, res)
}

func (s *Service) deleteTaskHandler(c *gin.Context) {
	var task *TaskInfo
	taskID := c.Query("taskID")
	task, err := controller.db.queryTaskByID(taskID)
	if err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}
	if task.State == StateRunning {
		c.String(http.StatusOK, "cannot delete task [%s], task is running", taskID)
		return
	}
	controller.cleanTask(task)
	c.String(http.StatusOK, "task [%s] deleted", taskID)
}

func (s *Service) previewHandler(c *gin.Context) {
	taskID := c.Query("taskID")
	if taskID == "" {
		c.String(http.StatusBadRequest, "no taskID provided")
		return
	}
	lines, err := controller.db.previewTask(taskID)
	if err != nil {
		c.String(http.StatusInternalServerError, err.Error())
		return
	}
	c.JSON(http.StatusOK, lines)
}

func (s *Service) downloadHandler(c *gin.Context) {
	var err error
	taskGroupID := c.Query("taskGroupID")
	taskID := c.Query("taskID")
	if taskGroupID != "" {
		err = controller.dumpClusterLogs(taskGroupID, c.Writer)
		if err != nil {
			c.String(http.StatusInternalServerError, err.Error())
		}
		return
	}
	if taskID != "" {
		err = controller.dumpLog(taskID, c.Writer)
		if err != nil {
			c.String(http.StatusInternalServerError, err.Error())
		}
	}
}

type Service struct {
	config *config.Config
}

func NewService(config *config.Config) *Service {
	return &Service{config: config}
}

func (s *Service) Register(r *gin.RouterGroup) {
	endpoint := r.Group("/logs")
	endpoint.GET("/fetch", s.fetchHandler)
	endpoint.GET("/listAllTasks", s.listAllTasksHandler)
	endpoint.GET("/cancelTaskGroup", s.cancelTaskGroupHandler)
	endpoint.GET("/cancelTask", s.cancelTaskHandler)
	endpoint.GET("/deleteTaskGroup", s.deleteTaskGroupHandler)
	endpoint.GET("/deleteTask", s.deleteTaskHandler)
	endpoint.GET("/preview", s.previewHandler)
	endpoint.GET("/download", s.downloadHandler)
}
