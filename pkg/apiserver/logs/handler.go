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
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/kvproto/pkg/diagnosticspb"
)

const defaultSearchLogDuration = 24 * time.Hour

// @Summary GetLogs
// @Description Get logs from TiDB, TiKV, PD
// @Accept json
// @Produce json
// @Param serverType path string true "Server type"
// @Success 200 {string} string
// @Router /logs/{serverType} [get]
func fetchHandler(c *gin.Context) {
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

func listAllTasksHandler(c *gin.Context) {
	tasks, err := controller.getAllTasks()
	if err != nil {
		c.String(http.StatusInternalServerError, err.Error())
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func cancelTaskGroupHandler(c *gin.Context) {
	taskGroupID := c.Query("taskGroupID")
	err := controller.stopTaskGroup(taskGroupID, false)
	if err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}
	c.String(http.StatusOK, "")
}

func cancelTaskHandler(c *gin.Context) {
	taskID := c.Query("taskID")
	err := controller.stopTask(taskID, false)
	if err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}
	c.String(http.StatusOK, "")
}

func deleteTaskGroupHandler(c *gin.Context) {
	taskGroupID := c.Query("taskGroupID")
	err := controller.stopTaskGroup(taskGroupID, true)
	if err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}
	c.String(http.StatusOK, "")
}

func deleteTaskHandler(c *gin.Context) {
	taskID := c.Query("taskID")
	err := controller.stopTask(taskID, true)
	if err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}
	c.String(http.StatusOK, "")
}

func previewHandler(c *gin.Context) {
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

func downloadHandler(c *gin.Context) {
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

func RegisterService(r *gin.RouterGroup) {
	endpoint := r.Group("/logs")
	endpoint.GET("/fetch", fetchHandler)
	endpoint.GET("/listAllTasks", listAllTasksHandler)
	endpoint.GET("/cancelTaskGroup", cancelTaskGroupHandler)
	endpoint.GET("/cancelTask", cancelTaskHandler)
	endpoint.GET("/deleteTaskGroup", deleteTaskGroupHandler)
	endpoint.GET("/deleteTask", deleteTaskHandler)
	endpoint.GET("/preview", previewHandler)
	endpoint.GET("/download", downloadHandler)
}
