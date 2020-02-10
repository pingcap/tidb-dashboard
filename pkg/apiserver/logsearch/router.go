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
	"archive/tar"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/kvproto/pkg/diagnosticspb"
)

type Service struct {
	config *config.Config
}

var logsSavePath string

func NewService(config *config.Config, db *dbstore.DB) *Service {
	logsSavePath = path.Join(config.DataDir, "logs")
	os.MkdirAll(logsSavePath, 0777)

	dbClient = DBClient{db}
	dbClient.initModel()

	scheduler = NewScheduler()
	err := scheduler.loadTasksFromDB()
	if err != nil {
		panic(err)
	}
	return &Service{config: config}
}

func (s *Service) Register(r *gin.RouterGroup) {
	endpoint := r.Group("/logs")

	endpoint.GET("/tasks", s.TaskGetList)
	endpoint.GET("/tasks/preview/:id", s.TaskPreview)
	endpoint.GET("/tasks/preview", s.MultipleTaskPreview)
	endpoint.POST("/tasks", s.TaskGroupCreate)
	endpoint.POST("/tasks/run/:id", s.TaskRun)
	endpoint.GET("/tasks/download/:id", s.TaskDownload)
	endpoint.GET("/tasks/download", s.MultipleTaskDownload)
	endpoint.POST("/tasks/cancel/:id", s.TaskCancel)
	endpoint.DELETE("/tasks/:id", s.TaskDelete)
}

// @Summary List tasks
// @Description list all log search tasks
// @Produce json
// @Success 200 {array} TaskModel
// @Failure 400 {object} HTTPError
// @Router /tasks [get]
func (s *Service) TaskGetList(c *gin.Context) {
	tasks, err := dbClient.queryAllTasks()
	if err != nil {
		NewError(c, http.StatusBadRequest, err)
		return
	}
	c.JSON(http.StatusOK, tasks)
}

// @Summary Preview logs by task ID
// @Description preview fetched logs in a task
// @Produce json
// @Param id path string true "task id"
// @Success 200 {array} PreviewModel
// @Failure 400 {object} HTTPError
// @Router /tasks/preview/{id} [get]
func (s *Service) TaskPreview(c *gin.Context) {
	taskID := c.Param("id")
	lines, err := dbClient.previewTask(taskID)
	if err != nil {
		NewError(c, http.StatusBadRequest, err)
		return
	}
	c.JSON(http.StatusOK, lines)
}

type LogPreview struct {
	task    TaskModel
	preview []PreviewModel
}

type LinePreview struct {
	TaskID     string                    `json:"task_id"`
	ServerType string                    `json:"server_type"`
	Address    string                    `json:"address"`
	Message    *diagnosticspb.LogMessage `json:"message"`
}

// @Summary Preview logs by task IDs
// @Description preview fetched logs in multiple tasks
// @Produce json
// @Param id query string true "task id"
// @Success 200 {array} LinePreview
// @Failure 400 {object} HTTPError
// @Router /tasks/preview/ [get]
func (s *Service) MultipleTaskPreview(c *gin.Context) {
	ids := c.QueryArray("id")
	previews, err := getPreviews(ids)
	if err != nil {
		NewError(c, http.StatusBadRequest, err)
		return
	}
	res := mergeLines(previews)
	c.JSON(http.StatusOK, res)
}

func getPreviews(ids []string) ([]*LogPreview, error) {
	previews := make([]*LogPreview, 0, len(ids))
	for _, taskID := range ids {
		task, err := dbClient.queryTaskByID(taskID)
		if err != nil {
			return nil, err
		}
		lines, err := dbClient.previewTask(taskID)
		if err != nil {
			return nil, err
		}
		previews = append(previews, &LogPreview{
			task,
			lines,
		})
	}
	return previews, nil
}

// @Summary Create task group
// @Description create and run a task group
// @Produce json
// @Failure 400 {object} HTTPError
// @Failure 500 {object} HTTPError
// @Router /tasks [post]
func (s *Service) TaskGroupCreate(c *gin.Context) {
	// TODO: using parameters provided by client
	endTime := time.Now().UnixNano() / int64(time.Millisecond)
	startTime := int64(0)
	var searchLogReq = &SearchLogRequest{
		StartTime: startTime,
		EndTime:   endTime,
		Levels:    nil,
		Patterns:  nil,
	}
	var components = []*Component{
		{
			ServerType: "tidb",
			IP:         "127.0.0.1",
			Port:       "4000",
			StatusPort: "10080",
		},
	}
	taskGroupID := scheduler.addTasks(components, searchLogReq)
	err := scheduler.runTaskGroup(taskGroupID)
	if err != nil {
		NewError(c, http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"msg": "success",
	})
}

// @Summary Run task
// @Description run task by task id
// @Produce json
// @Param id path string true "task id"
// @Failure 400 {object} HTTPError
// @Failure 500 {object} HTTPError
// @Router /tasks/run/{id} [get]
func (s *Service) TaskRun(c *gin.Context) {
	taskID := c.Param("id")
	taskModel, err := dbClient.queryTaskByID(taskID)
	if err != nil {
		NewError(c, http.StatusBadRequest, err)
		return
	}
	// TODO: fix this
	task := ToTask(&taskModel)
	err = scheduler.deleteTask(task)
	if err != nil {
		NewError(c, http.StatusInternalServerError, err)
		return
	}
	scheduler.storeTask(task)
	go task.run()
	c.JSON(http.StatusOK, gin.H{
		"msg": "success",
	})
}

// @Summary Download logs by task ID
// @Description download logs by task id
// @Produce application/zip
// @Param id path string true "task id"
// @Failure 400 {object} HTTPError
// @Failure 500 {object} HTTPError
// @Router /tasks/download/{id} [get]
func (s *Service) TaskDownload(c *gin.Context) {
	taskID := c.Param("id")
	task, err := dbClient.queryTaskByID(taskID)
	if err != nil {
		NewError(c, http.StatusBadRequest, err)
		return
	}
	f, err := os.Open(task.SavedPath)
	if err != nil {
		NewError(c, http.StatusInternalServerError, err)
		return
	}
	_, err = io.Copy(c.Writer, f)
	if err != nil {
		NewError(c, http.StatusInternalServerError, err)
		return
	}
}

// @Summary Download logs by task IDs
// @Description download logs by multiple task IDs
// @Produce application/x-tar
// @Failure 400 {object} HTTPError
// @Failure 500 {object} HTTPError
// @Router /tasks/download [get]
func (s *Service) MultipleTaskDownload(c *gin.Context) {
	ids := c.QueryArray("id")
	tasks := make([]*TaskModel, 0, len(ids))
	for _, taskID := range ids {
		task, err := dbClient.queryTaskByID(taskID)
		if err != nil {
			NewError(c, http.StatusBadRequest, err)
			return
		}
		tasks = append(tasks, &task)
	}
	err := dumpLogs(tasks, c.Writer)
	if err != nil {
		NewError(c, http.StatusInternalServerError, err)
		return
	}
}

func dumpLogs(tasks []*TaskModel, w http.ResponseWriter) error {
	tw := tar.NewWriter(w)
	defer tw.Close()
	for _, task := range tasks {
		err := dumpLog(task.SavedPath, tw)
		if err != nil {
			return err
		}
	}
	return nil
}

func dumpLog(savedPath string, tw *tar.Writer) error {
	f, err := os.Open(savedPath)
	if err != nil {
		return err
	}
	defer f.Close()
	fi, err := f.Stat()
	if err != nil {
		return err
	}
	err = tw.WriteHeader(&tar.Header{
		Name:    path.Base(savedPath),
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
	return nil
}

// @Summary Cancel task
// @Description cancel task by task ID
// @Produce json
// @Param id path string true "task id"
// @Failure 400 {object} HTTPError
// @Failure 500 {object} HTTPError
// @Router /tasks/cancel/{id} [post]
func (s *Service) TaskCancel(c *gin.Context) {
	taskID := c.Param("id")
	task, err := dbClient.queryTaskByID(taskID)
	if err != nil {
		NewError(c, http.StatusBadRequest, err)
		return
	}
	if task.State != StateRunning {
		NewError(c, http.StatusInternalServerError,
			fmt.Errorf("task [%s] has been %s", taskID, task.State),
		)
		return
	}
	err = scheduler.abortTaskByID(taskID)
	if err != nil {
		NewError(c, http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"msg": "success",
	})
}

// @Summary Delete task
// @Description delete task by task ID
// @Produce json
// @Param id path string true "task id"
// @Failure 400 {object} HTTPError
// @Failure 500 {object} HTTPError
// @Router /tasks/{id} [delete]
func (s *Service) TaskDelete(c *gin.Context) {
	taskID := c.Param("id")
	taskModel, err := dbClient.queryTaskByID(taskID)
	if err != nil {
		NewError(c, http.StatusBadRequest, err)
		return
	}
	err = scheduler.deleteTask(ToTask(&taskModel))
	if err != nil {
		NewError(c, http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"msg": "success",
	})
}
