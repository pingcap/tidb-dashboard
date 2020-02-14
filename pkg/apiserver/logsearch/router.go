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
	"io"
	"net/http"
	"os"
	"path"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/httputil"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

type Service struct {
	config    *config.Config
	db        *dbstore.DB
	scheduler *Scheduler
}

var logsSavePath string

func NewService(config *config.Config, db *dbstore.DB) *Service {
	logsSavePath = path.Join(config.DataDir, "logs")
	os.MkdirAll(logsSavePath, 0777) //nolint:errcheck

	autoMigrate(db)
	cleanRunningTasks(db)

	scheduler := NewScheduler(db)
	scheduler.fillTasks()

	return &Service{
		config:    config,
		db:        db,
		scheduler: scheduler,
	}
}

func (s *Service) Register(r *gin.RouterGroup) {
	endpoint := r.Group("/logs")

	endpoint.GET("/tasks", s.GetTasks)
	endpoint.GET("/tasks/:id/preview", s.TaskPreview)
	endpoint.GET("/tasks/:id/download", s.TaskDownload)
	endpoint.GET("/download", s.MultipleTaskDownload)
	endpoint.POST("/taskgroups", s.TaskGroupCreate)
	endpoint.GET("/taskgroups/:id", s.TaskGroupGet)
	endpoint.GET("/taskgroups/:id/preview", s.TaskGroupPreview)
	endpoint.POST("/taskgroups/:id/retry", s.TaskRetry)
	endpoint.POST("/taskgroups/:id/cancel", s.TaskCancel)
	endpoint.DELETE("/taskgroups/:id", s.TaskGroupDelete)
}

// @Summary List all tasks
// @Description list all log search tasks
// @Produce json
// @Success 200 {array} TaskModel
// @Failure 400 {object} httputil.HTTPError
// @Router /logs/tasks [get]
func (s *Service) GetTasks(c *gin.Context) {
	var tasks []TaskModel
	err := s.db.Find(&tasks).Error
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	c.JSON(http.StatusOK, tasks)
}

// @Summary Preview logs in a task
// @Description preview fetched logs in a task by providing task ID
// @Produce json
// @Param id path string true "task id"
// @Success 200 {array} PreviewModel
// @Failure 400 {object} httputil.HTTPError
// @Router /logs/tasks/{id}/preview [get]
func (s *Service) TaskPreview(c *gin.Context) {
	taskID := c.Param("id")
	var lines []PreviewModel
	err := s.db.Where("task_id = ?", taskID).Order("time").Find(&lines).Error
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	c.JSON(http.StatusOK, lines)
}

type TaskGroupCreateCommand struct {
	Request    SearchLogRequest `json:"request"`
	Components []Component      `json:"components"`
}

// @Summary Create a task group
// @Description create and run a task group
// @Produce json
// @Param command body TaskGroupCreateCommand true "request body"
// @Success 200 {object} httputil.HTTPSuccess
// @Failure 400 {object} httputil.HTTPError
// @Failure 500 {object} httputil.HTTPError
// @Router /logs/taskgroups [post]
func (s *Service) TaskGroupCreate(c *gin.Context) {
	var command TaskGroupCreateCommand
	err := c.BindJSON(&command)
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	taskGroup := s.scheduler.addTasks(command.Components, command.Request)
	err = s.scheduler.runTaskGroup(taskGroup, false)
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}
	httputil.Success(c)
}

// @Summary Download logs by task ID
// @Description download logs by task id
// @Produce application/zip
// @Param id path string true "task id"
// @Failure 400 {object} httputil.HTTPError
// @Failure 500 {object} httputil.HTTPError
// @Router /logs/tasks/{id}/download [get]
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
	stat, err := f.Stat()
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}
	contentLength := stat.Size()
	contentType := "application/zip"
	extraHeaders := map[string]string{
		"Content-Disposition": fmt.Sprintf(`attachment; filename="%s"`, stat.Name()),
	}
	c.DataFromReader(http.StatusOK, contentLength, contentType, f, extraHeaders)
}

func (s *Service) queryTaskByID(taskID string) (task TaskModel, err error) {
	err = s.db.Where("id = ?", taskID).First(&task).Error
	return
}

// @Summary Download logs by task IDs
// @Description download logs by multiple task IDs
// @Produce application/x-tar
// @Param id query string false "task id"
// @Failure 400 {object} httputil.HTTPError
// @Failure 500 {object} httputil.HTTPError
// @Router /logs/download [get]
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
	reader, writer := io.Pipe()
	go func() {
		err := packLogsAsTarball(tasks, writer)
		defer writer.Close() //nolint:errcheck
		if err != nil {
			log.Warn(fmt.Sprintf("failed to pack logs as tarball: error=%s", err))
		}
	}()
	contentLength := int64(-1) // Note: we don't know the content length
	contentType := "application/tar"
	extraHeaders := map[string]string{
		"Content-Disposition": `attachment; filename="logs.tar"`,
	}
	c.DataFromReader(http.StatusOK, contentLength, contentType, reader, extraHeaders)
}

// @Summary List tasks in a task group
// @Description list all log search tasks in a task group by providing task group ID
// @Produce json
// @Param id path string true "task group id"
// @Success 200 {array} TaskModel
// @Failure 400 {object} httputil.HTTPError
// @Router /logs/taskgroups/{id} [get]
func (s *Service) TaskGroupGet(c *gin.Context) {
	taskGroupID := c.Param("id")
	var tasks []TaskModel
	err := s.db.Where("task_group_id = ?", taskGroupID).Find(&tasks).Error
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	c.JSON(http.StatusOK, tasks)
}

// @Summary Preview logs in a task group
// @Description preview fetched logs in a task group by providing task group ID
// @Produce json
// @Param id query string true "task group id"
// @Success 200 {array} PreviewModel
// @Failure 400 {object} httputil.HTTPError
// @Router /logs/taskgroups/{id}/preview/ [get]
func (s *Service) TaskGroupPreview(c *gin.Context) {
	taskGroupID := c.Param("id")
	var lines []PreviewModel
	err := s.db.
		Where("task_group_id = ?", taskGroupID).
		Order("time").
		Limit(PreviewLogLinesLimit).
		Find(&lines).Error
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}

	httputil.Success(c)
}

// @Summary Retry failed tasks
// @Description retry tasks that has been failed in a task group
// @Produce json
// @Param id path string true "task group id"
// @Success 200 {object} httputil.HTTPSuccess
// @Failure 400 {object} httputil.HTTPError
// @Failure 500 {object} httputil.HTTPError
// @Router /logs/taskgroups/{id}/retry [post]
func (s *Service) TaskRetry(c *gin.Context) {
	taskGroupID := c.Param("id")
	taskGroup := TaskGroupModel{}
	err := s.db.Where("id = ", taskGroupID).First(&taskGroup).Error
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	err = s.scheduler.runTaskGroup(&taskGroup, true)
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}
	httputil.Success(c)
}

// @Summary Cancel running tasks
// @Description cancel all running tasks in a task group
// @Produce json
// @Param id path string true "task group id"
// @Success 200 {object} httputil.HTTPSuccess
// @Failure 400 {object} httputil.HTTPError
// @Failure 500 {object} httputil.HTTPError
// @Router /logs/taskgroups/{id}/cancel [post]
func (s *Service) TaskCancel(c *gin.Context) {
	taskGroupID := c.Param("id")
	taskGroup := TaskGroupModel{}
	err := s.db.Where("id = ", taskGroupID).First(&taskGroup).Error
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	if taskGroup.State != StateRunning {
		httputil.NewError(c, http.StatusBadRequest, fmt.Errorf("failed to cancel, task group is %s", taskGroup.State))
		return
	}
	err = s.scheduler.abortTaskGroup(taskGroupID)
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}
	httputil.Success(c)
}

// @Summary Delete task group
// @Description delete a task group by providing task group ID
// @Produce json
// @Param id path string true "task group id"
// @Success 200 {object} httputil.HTTPSuccess
// @Failure 500 {object} httputil.HTTPError
// @Router /logs/taskgroups/{id} [delete]
func (s *Service) TaskGroupDelete(c *gin.Context) {
	taskGroupID := c.Param("id")
	err := s.deleteTasks(taskGroupID)
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}
	httputil.Success(c)
}

// deleteTasks delete all things belong a task group
// include temporary files, and data in sqlite database
func (s *Service) deleteTasks(taskGroupID string) error {
	taskGroupModel := TaskGroupModel{}
	err := s.db.Where("id = ?", taskGroupID).Find(&taskGroupModel).Error
	if err != nil {
		return err
	}
	if taskGroupModel.State == StateRunning {
		return fmt.Errorf("failed to delete, task group [%s] is running", taskGroupID)
	}
	os.RemoveAll(path.Join(logsSavePath, taskGroupID))
	err = s.db.Where("task_group_id = ?", taskGroupID).Delete(&PreviewModel{}).Error
	if err != nil {
		return err
	}
	err = s.db.Where("task_group_id = ?", taskGroupID).Delete(&TaskModel{}).Error
	if err != nil {
		return err
	}
	err = s.db.Where("id = ?", taskGroupID).Delete(&TaskGroupModel{}).Error
	if err != nil {
		return err
	}
	return nil
}
