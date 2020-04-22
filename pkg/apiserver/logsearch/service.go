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
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

type Service struct {
	config            *config.Config
	logStoreDirectory string
	db                *dbstore.DB
	scheduler         *Scheduler
}

func NewService(config *config.Config, db *dbstore.DB) *Service {
	dir, err := ioutil.TempDir("", "dashboard-logs")
	if err != nil {
		log.Fatal("Failed to create directory for storing logs", zap.Error(err))
	}
	err = autoMigrate(db)
	if err != nil {
		log.Fatal("Failed to initialize database", zap.Error(err))
	}
	cleanupAllTasks(db)

	service := &Service{
		config:            config,
		logStoreDirectory: dir,
		db:                db,
		scheduler:         nil, // will be filled after scheduler is created
	}
	scheduler := NewScheduler(service)
	service.scheduler = scheduler

	return service
}

func Register(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/logs")

	endpoint.GET("/download", s.DownloadLogs)
	endpoint.GET("/download/acquire_token", auth.MWAuthRequired(), s.GetDownloadToken)
	endpoint.PUT("/taskgroup", auth.MWAuthRequired(), s.CreateTaskGroup)
	endpoint.GET("/taskgroups", auth.MWAuthRequired(), s.GetAllTaskGroups)
	endpoint.GET("/taskgroups/:id", auth.MWAuthRequired(), s.GetTaskGroup)
	endpoint.GET("/taskgroups/:id/preview", auth.MWAuthRequired(), s.GetTaskGroupPreview)
	endpoint.POST("/taskgroups/:id/retry", auth.MWAuthRequired(), s.RetryTask)
	endpoint.POST("/taskgroups/:id/cancel", auth.MWAuthRequired(), s.CancelTask)
	endpoint.DELETE("/taskgroups/:id", auth.MWAuthRequired(), s.DeleteTaskGroup)
}

type CreateTaskGroupRequest struct {
	Request SearchLogRequest          `json:"request" binding:"required"`
	Targets []utils.RequestTargetNode `json:"targets" binding:"required"`
}

type TaskGroupResponse struct {
	TaskGroup TaskGroupModel `json:"task_group"`
	Tasks     []*TaskModel   `json:"tasks"`
}

// @Summary Create and run task group
// @Description Create and run task group
// @Produce json
// @Param request body CreateTaskGroupRequest true "Request body"
// @Security JwtAuth
// @Success 200 {object} TaskGroupResponse
// @Failure 400 {object} utils.APIError
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
// @Router /logs/taskgroup [put]
func (s *Service) CreateTaskGroup(c *gin.Context) {
	var req CreateTaskGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(utils.ErrInvalidRequest.WrapWithNoMessage(err))
		return
	}
	if len(req.Targets) == 0 {
		c.Status(http.StatusBadRequest)
		_ = c.Error(utils.ErrInvalidRequest.NewWithNoMessage())
		return
	}
	stats := utils.NewRequestTargetStatisticsFromArray(&req.Targets)
	taskGroup := TaskGroupModel{
		SearchRequest: &req.Request,
		State:         TaskGroupStateRunning,
		TargetStats:   stats,
	}
	if err := s.db.Create(&taskGroup).Error; err != nil {
		_ = c.Error(err)
		return
	}
	tasks := make([]*TaskModel, 0, len(req.Targets))
	for _, t := range req.Targets {
		target := t
		task := &TaskModel{
			TaskGroupID: taskGroup.ID,
			Target:      &target,
			State:       TaskStateRunning,
		}
		// Ignore task creation errors
		s.db.Create(task)
		tasks = append(tasks, task)
	}
	if !s.scheduler.AsyncStart(&taskGroup, tasks) {
		log.Error("Failed to start task group", zap.Uint("task_group_id", taskGroup.ID))
	}
	resp := TaskGroupResponse{
		TaskGroup: taskGroup,
		Tasks:     tasks,
	}
	c.JSON(http.StatusOK, resp)
}

// @Summary List all task groups
// @Description list all log search taskgroups
// @Produce json
// @Security JwtAuth
// @Success 200 {array} TaskGroupModel
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
// @Router /logs/taskgroups [get]
func (s *Service) GetAllTaskGroups(c *gin.Context) {
	var taskGroups []*TaskGroupModel
	err := s.db.Find(&taskGroups).Error
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusOK, taskGroups)
}

// @Summary List tasks in a task group
// @Description list all log search tasks in a task group by providing task group ID
// @Produce json
// @Param id path string true "Task Group ID"
// @Security JwtAuth
// @Success 200 {object} TaskGroupResponse
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
// @Router /logs/taskgroups/{id} [get]
func (s *Service) GetTaskGroup(c *gin.Context) {
	taskGroupID := c.Param("id")
	var taskGroup TaskGroupModel
	var tasks []*TaskModel
	err := s.db.First(&taskGroup, "id = ?", taskGroupID).Error
	if err != nil {
		_ = c.Error(err)
		return
	}
	err = s.db.Where("task_group_id = ?", taskGroupID).Find(&tasks).Error
	if err != nil {
		_ = c.Error(err)
		return
	}
	resp := TaskGroupResponse{
		TaskGroup: taskGroup,
		Tasks:     tasks,
	}
	c.JSON(http.StatusOK, resp)
}

// @Summary Preview logs in a task group
// @Description preview fetched logs in a task group by providing task group ID
// @Produce json
// @Param id path string true "task group id"
// @Security JwtAuth
// @Success 200 {array} PreviewModel
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
// @Router /logs/taskgroups/{id}/preview [get]
func (s *Service) GetTaskGroupPreview(c *gin.Context) {
	taskGroupID := c.Param("id")
	var lines []PreviewModel
	err := s.db.
		Where("task_group_id = ?", taskGroupID).
		Order("time").
		Limit(TaskMaxPreviewLines).
		Find(&lines).Error
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, lines)
}

// @Summary Retry failed tasks
// @Description retry tasks that has been failed in a task group
// @Produce json
// @Param id path string true "task group id"
// @Security JwtAuth
// @Success 200 {object} utils.APIEmptyResponse
// @Failure 400 {object} utils.APIError
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
// @Router /logs/taskgroups/{id}/retry [post]
func (s *Service) RetryTask(c *gin.Context) {
	taskGroupID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(utils.ErrInvalidRequest.WrapWithNoMessage(err))
		return
	}

	// Currently we can only retry finished task group.
	taskGroup := TaskGroupModel{}
	if err := s.db.Where("id = ? AND state = ?", taskGroupID, TaskGroupStateFinished).First(&taskGroup).Error; err != nil {
		_ = c.Error(err)
		return
	}

	tasks := make([]*TaskModel, 0)
	if err := s.db.Where("task_group_id = ? AND state = ?", taskGroupID, TaskStateError).Find(&tasks).Error; err != nil {
		_ = c.Error(err)
		return
	}

	if len(tasks) == 0 {
		// No tasks to retry
		c.JSON(http.StatusOK, utils.APIEmptyResponse{})
		return
	}

	// Reset task status
	taskGroup.State = TaskGroupStateRunning
	s.db.Save(&taskGroup)
	for _, task := range tasks {
		task.Error = nil
		task.State = TaskStateRunning
		s.db.Save(task)
	}

	if !s.scheduler.AsyncStart(&taskGroup, tasks) {
		log.Error("Failed to retry task group", zap.Uint("task_group_id", taskGroup.ID))
	}
	c.JSON(http.StatusOK, utils.APIEmptyResponse{})
}

// @Summary Cancel running tasks
// @Description cancel all running tasks in a task group
// @Produce json
// @Param id path string true "task group id"
// @Security JwtAuth
// @Success 200 {object} utils.APIEmptyResponse
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 400 {object} utils.APIError
// @Router /logs/taskgroups/{id}/cancel [post]
func (s *Service) CancelTask(c *gin.Context) {
	taskGroupID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(utils.ErrInvalidRequest.WrapWithNoMessage(err))
		return
	}
	taskGroup := TaskGroupModel{}
	err = s.db.First(&taskGroup, taskGroupID).Error
	if err != nil {
		_ = c.Error(err)
		return
	}
	if taskGroup.State != TaskGroupStateRunning {
		c.Status(http.StatusBadRequest)
		_ = c.Error(fmt.Errorf("taskGroup is not running"))
		return
	}
	s.scheduler.AsyncAbort(uint(taskGroupID))
	c.JSON(http.StatusOK, utils.APIEmptyResponse{})
}

// @Summary Delete task group
// @Description delete a task group by providing task group ID
// @Produce json
// @Param id path string true "task group id"
// @Security JwtAuth
// @Success 200 {object} utils.APIEmptyResponse
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
// @Router /logs/taskgroups/{id} [delete]
func (s *Service) DeleteTaskGroup(c *gin.Context) {
	taskGroupID := c.Param("id")
	taskGroup := TaskGroupModel{}
	err := s.db.Where("id = ? AND state != ?", taskGroupID, TaskGroupStateRunning).First(&taskGroup).Error
	if err != nil {
		_ = c.Error(err)
		return
	}
	taskGroup.Delete(s.db)
	c.JSON(http.StatusOK, utils.APIEmptyResponse{})
}

// @Summary Get download token
// @Description get download token with multiple task IDs
// @Produce plain
// @Param id query []string false "task id" collectionFormat(csv)
// @Security JwtAuth
// @Success 200 {string} string "xxx"
// @Failure 400 {object} utils.APIError
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Router /logs/download/acquire_token [get]
func (s *Service) GetDownloadToken(c *gin.Context) {
	ids := c.QueryArray("id")
	str := strings.Join(ids, ",")
	token, err := utils.NewJWTString("logs/download", str)
	if err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(utils.ErrInvalidRequest.WrapWithNoMessage(err))
		return
	}
	c.String(http.StatusOK, token)
}

// @Summary Download
// @Description download logs by multiple task IDs
// @Produce application/x-tar,application/zip
// @Param token query string true "download token"
// @Failure 400 {object} utils.APIError
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
// @Router /logs/download [get]
func (s *Service) DownloadLogs(c *gin.Context) {
	token := c.Query("token")
	str, err := utils.ParseJWTString("logs/download", token)
	if err != nil {
		c.Status(http.StatusUnauthorized)
		_ = c.Error(utils.ErrInvalidRequest.New(err.Error()))
		return
	}
	ids := strings.Split(str, ",")
	tasks := make([]*TaskModel, 0, len(ids))
	for _, id := range ids {
		var task TaskModel
		if s.db.
			Where("id = ? AND state = ?", id, TaskStateFinished).
			First(&task).
			Error == nil {
			tasks = append(tasks, &task)
			// Ignore errors silently
		}
	}

	switch len(tasks) {
	case 0:
		c.Status(http.StatusBadRequest)
		_ = c.Error(utils.ErrInvalidRequest.New("At least one target should be provided"))
	case 1:
		serveTaskForDownload(tasks[0], c)
	default:
		serveMultipleTaskForDownload(tasks, c)
	}
}
