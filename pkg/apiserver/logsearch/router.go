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

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/httputil"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

type Service struct {
	config *config.Config
	db     *dbstore.DB
}

var logsSavePath string

func NewService(config *config.Config, db *dbstore.DB) *Service {
	logsSavePath = path.Join(config.DataDir, "logs")
	os.MkdirAll(logsSavePath, 0777) //nolint:errcheck

	initModel(db)

	// TODO: delete unfinished tasks in preview_model table
	db.Where("state != ?", StateFinished).Delete(&TaskModel{})

	scheduler = NewScheduler(db)
	tasks, err := loadTasksFromDB(db)
	if err != nil {
		panic(err)
	}
	for _, task := range tasks {
		scheduler.storeTask(task)
	}
	return &Service{
		config: config,
		db:     db,
	}
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
// @Failure 400 {object} httputil.HTTPError
// @Router /tasks [get]
func (s *Service) TaskGetList(c *gin.Context) {
	var tasks []TaskModel
	err := s.db.Find(&tasks).Error
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	c.JSON(http.StatusOK, tasks)
}

// @Summary Preview logs by task ID
// @Description preview fetched logs in a task
// @Produce json
// @Param id path string true "task id"
// @Success 200 {array} PreviewModel
// @Failure 400 {object} httputil.HTTPError
// @Router /tasks/preview/{id} [get]
func (s *Service) TaskPreview(c *gin.Context) {
	taskID := c.Param("id")
	var lines []PreviewModel
	err := s.db.Where("task_id = ?", taskID).Find(&lines).Error
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	c.JSON(http.StatusOK, lines)
}

// @Summary Preview logs by task IDs
// @Description preview fetched logs in multiple tasks
// @Produce json
// @Param id query string true "task id"
// @Success 200 {array} LinePreview
// @Failure 400 {object} httputil.HTTPError
// @Router /tasks/preview/ [get]
func (s *Service) MultipleTaskPreview(c *gin.Context) {
	ids := c.QueryArray("id")
	previews, err := s.getPreviews(ids)
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	res := mergeLines(previews)
	c.JSON(http.StatusOK, res)
}

func (s *Service) getPreviews(ids []string) ([]*LogPreview, error) {
	previews := make([]*LogPreview, 0, len(ids))
	for _, taskID := range ids {
		task, err := s.queryTaskByID(taskID)
		if err != nil {
			return nil, err
		}
		var lines []PreviewModel
		err = s.db.Where("task_id = ?", taskID).Find(&previews).Error
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
// @Failure 400 {object} httputil.HTTPError
// @Failure 500 {object} httputil.HTTPError
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
		httputil.NewError(c, http.StatusInternalServerError, err)
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
// @Failure 400 {object} httputil.HTTPError
// @Failure 500 {object} httputil.HTTPError
// @Router /tasks/run/{id} [get]
func (s *Service) TaskRun(c *gin.Context) {
	taskID := c.Param("id")
	taskModel, err := s.queryTaskByID(taskID)
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	// TODO: fix this
	task := toTask(taskModel, s.db)
	err = scheduler.deleteTask(task)
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
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
// @Failure 400 {object} httputil.HTTPError
// @Failure 500 {object} httputil.HTTPError
// @Router /tasks/download/{id} [get]
func (s *Service) TaskDownload(c *gin.Context) {
	taskID := c.Param("id")
	task, err := s.queryTaskByID(taskID)
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	f, err := os.Open(task.SavedPath)
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}
	_, err = io.Copy(c.Writer, f)
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}
}

// @Summary Download logs by task IDs
// @Description download logs by multiple task IDs
// @Produce application/x-tar
// @Failure 400 {object} httputil.HTTPError
// @Failure 500 {object} httputil.HTTPError
// @Router /tasks/download [get]
func (s *Service) MultipleTaskDownload(c *gin.Context) {
	ids := c.QueryArray("id")
	tasks := make([]*TaskModel, 0, len(ids))
	for _, taskID := range ids {
		task, err := s.queryTaskByID(taskID)
		if err != nil {
			httputil.NewError(c, http.StatusBadRequest, err)
			return
		}
		tasks = append(tasks, &task)
	}
	err := dumpLogs(tasks, c.Writer)
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
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
// @Failure 400 {object} httputil.HTTPError
// @Failure 500 {object} httputil.HTTPError
// @Router /tasks/cancel/{id} [post]
func (s *Service) TaskCancel(c *gin.Context) {
	taskID := c.Param("id")
	task, err := s.queryTaskByID(taskID)
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	if task.State != StateRunning {
		httputil.NewError(c, http.StatusInternalServerError,
			fmt.Errorf("task [%s] has been %s", taskID, task.State),
		)
		return
	}
	err = scheduler.abortTaskByID(taskID)
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
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
// @Failure 400 {object} httputil.HTTPError
// @Failure 500 {object} httputil.HTTPError
// @Router /tasks/{id} [delete]
func (s *Service) TaskDelete(c *gin.Context) {
	taskID := c.Param("id")
	taskModel, err := s.queryTaskByID(taskID)
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	err = scheduler.deleteTask(toTask(taskModel, s.db))
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"msg": "success",
	})
}

func (s *Service) queryTaskByID(taskID string) (task TaskModel, err error) {
	err = s.db.First(&task, "task_id = ?", taskID).Error
	return
}
