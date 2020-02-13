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

	taskGroup := loadLatestTaskGroup(db)
	scheduler := NewScheduler(taskGroup, db)
	scheduler.fillTasks(taskGroup)

	return &Service{
		config:    config,
		db:        db,
		scheduler: scheduler,
	}
}

func (s *Service) Register(r *gin.RouterGroup) {
	endpoint := r.Group("/logs")

	endpoint.GET("/tasks", s.TaskGetList)
	endpoint.GET("/tasks/:id/preview", s.TaskPreview)
	endpoint.GET("/tasks/:id/download", s.TaskDownload)
	endpoint.GET("/download", s.MultipleTaskDownload)
	endpoint.POST("/tasks/retry", s.TaskRetry)
	endpoint.POST("/tasks/cancel", s.TaskCancel)
	endpoint.POST("/taskgroups", s.TaskGroupCreate)
	endpoint.GET("/taskgroups/:id", s.TaskGroupGet)
	endpoint.GET("/taskgroups/:id/preview", s.TaskGroupPreview)
	endpoint.DELETE("/taskgroups/:id", s.TaskGroupDelete)
}

// @Summary List all tasks
// @Description list all log search tasks
// @Produce json
// @Success 200 {array} TaskModel
// @Failure 400 {object} httputil.HTTPError
// @Router /logs/tasks [get]
func (s *Service) TaskGetList(c *gin.Context) {
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
	err := s.db.Where("task_id = ?", taskID).Find(&lines).Error
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	c.JSON(http.StatusOK, lines)
}

// @Summary Create a task group
// @Description create and run a task group
// @Produce json
// @Success 200 {object} httputil.HTTPSuccess
// @Failure 400 {object} httputil.HTTPError
// @Failure 500 {object} httputil.HTTPError
// @Router /logs/taskgroups [post]
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
	if s.scheduler.taskGroup != nil && s.scheduler.taskGroup.State == StateRunning {
		httputil.NewError(c, http.StatusInternalServerError,
			fmt.Errorf("cannot start, task group is %s", StateRunning))
		return
	}
	s.scheduler.addTasks(components, searchLogReq)
	err := s.scheduler.runTaskGroup(false)
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
	_, err = io.Copy(c.Writer, f)
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}
}

func (s *Service) queryTaskByID(taskID string) (task TaskModel, err error) {
	err = s.db.First(&task, "task_id = ?", taskID).Error
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

// @Summary Retry failed tasks
// @Description retry tasks that has been failed
// @Produce json
// @Success 200 {object} httputil.HTTPSuccess
// @Failure 500 {object} httputil.HTTPError
// @Router /logs/tasks/retry [post]
func (s *Service) TaskRetry(c *gin.Context) {
	err := s.scheduler.runTaskGroup(true)
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}
	httputil.Success(c)
}

// @Summary Cancel running tasks
// @Description cancel all running tasks
// @Produce json
// @Success 200 {object} httputil.HTTPSuccess
// @Failure 500 {object} httputil.HTTPError
// @Router /logs/tasks/cancel [post]
func (s *Service) TaskCancel(c *gin.Context) {
	err := s.scheduler.abortRunningTasks()
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}
	httputil.Success(c)
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
		Order("time asc").
		Limit(PreviewLogLinesLimit).
		Find(&lines).Error
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
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
