// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package logsearch

import (
	"context"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

type Service struct {
	// FIXME: Use fx.In
	lifecycleCtx context.Context

	config            *config.Config
	logStoreDirectory string
	db                *dbstore.DB
	scheduler         *Scheduler
}

func NewService(lc fx.Lifecycle, config *config.Config, db *dbstore.DB) *Service {
	dir := config.TempDir
	if dir == "" {
		var err error
		dir, err = os.MkdirTemp("", "dashboard-logs")
		if err != nil {
			log.Fatal("Failed to create directory for storing logs", zap.Error(err))
		}
	}
	err := autoMigrate(db)
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

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			service.lifecycleCtx = ctx
			return nil
		},
	})

	return service
}

func RegisterRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/logs")
	{
		endpoint.GET("/download", s.DownloadLogs)
		endpoint.Use(auth.MWAuthRequired())
		{
			endpoint.GET("/download/acquire_token", s.GetDownloadToken)
			endpoint.PUT("/taskgroup", s.CreateTaskGroup)
			endpoint.GET("/taskgroups", s.GetAllTaskGroups)
			endpoint.GET("/taskgroups/:id", s.GetTaskGroup)
			endpoint.GET("/taskgroups/:id/preview", s.GetTaskGroupPreview)
			endpoint.POST("/taskgroups/:id/retry", s.RetryTask)
			endpoint.POST("/taskgroups/:id/cancel", s.CancelTask)
			endpoint.DELETE("/taskgroups/:id", s.DeleteTaskGroup)
		}
	}
}

type CreateTaskGroupRequest struct {
	Request SearchLogRequest          `json:"request" binding:"required"`
	Targets []model.RequestTargetNode `json:"targets" binding:"required"`
}

type TaskGroupResponse struct {
	TaskGroup TaskGroupModel `json:"task_group"`
	Tasks     []*TaskModel   `json:"tasks"`
}

// @Summary Create and run a new log search task group
// @Param request body CreateTaskGroupRequest true "Request body"
// @Security JwtAuth
// @Success 200 {object} TaskGroupResponse
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
// @Router /logs/taskgroup [put]
func (s *Service) CreateTaskGroup(c *gin.Context) {
	var req CreateTaskGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	if len(req.Targets) == 0 {
		rest.Error(c, rest.ErrBadRequest.New("Expect at least 1 target"))
		return
	}
	stats := model.NewRequestTargetStatisticsFromArray(&req.Targets)
	taskGroup := TaskGroupModel{
		SearchRequest: &req.Request,
		State:         TaskGroupStateRunning,
		TargetStats:   stats,
	}
	if err := s.db.Create(&taskGroup).Error; err != nil {
		rest.Error(c, err)
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

// @Summary List all log search task groups
// @Security JwtAuth
// @Success 200 {array} TaskGroupModel
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
// @Router /logs/taskgroups [get]
func (s *Service) GetAllTaskGroups(c *gin.Context) {
	var taskGroups []*TaskGroupModel
	err := s.db.Find(&taskGroups).Error
	if err != nil {
		rest.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, taskGroups)
}

// @Summary List tasks in a log search task group
// @Param id path string true "Task Group ID"
// @Security JwtAuth
// @Success 200 {object} TaskGroupResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
// @Router /logs/taskgroups/{id} [get]
func (s *Service) GetTaskGroup(c *gin.Context) {
	taskGroupID := c.Param("id")
	var taskGroup TaskGroupModel
	var tasks []*TaskModel
	err := s.db.First(&taskGroup, "id = ?", taskGroupID).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	err = s.db.Where("task_group_id = ?", taskGroupID).Find(&tasks).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	resp := TaskGroupResponse{
		TaskGroup: taskGroup,
		Tasks:     tasks,
	}
	c.JSON(http.StatusOK, resp)
}

// @Summary Preview a log search task group
// @Param id path string true "task group id"
// @Security JwtAuth
// @Success 200 {array} PreviewModel
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
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
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, lines)
}

// @Summary Retry failed tasks in a log search task group
// @Param id path string true "task group id"
// @Security JwtAuth
// @Success 200 {object} rest.EmptyResponse
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
// @Router /logs/taskgroups/{id}/retry [post]
func (s *Service) RetryTask(c *gin.Context) {
	taskGroupID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	// Currently we can only retry finished task group.
	taskGroup := TaskGroupModel{}
	if err := s.db.Where("id = ? AND state = ?", taskGroupID, TaskGroupStateFinished).First(&taskGroup).Error; err != nil {
		rest.Error(c, err)
		return
	}

	tasks := make([]*TaskModel, 0)
	if err := s.db.Where("task_group_id = ? AND state = ?", taskGroupID, TaskStateError).Find(&tasks).Error; err != nil {
		rest.Error(c, err)
		return
	}

	if len(tasks) == 0 {
		// No tasks to retry
		c.JSON(http.StatusOK, rest.EmptyResponse{})
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
	c.JSON(http.StatusOK, rest.EmptyResponse{})
}

// @Summary Cancel running tasks in a log search task group
// @Param id path string true "task group id"
// @Security JwtAuth
// @Success 200 {object} rest.EmptyResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 400 {object} rest.ErrorResponse
// @Router /logs/taskgroups/{id}/cancel [post]
func (s *Service) CancelTask(c *gin.Context) {
	taskGroupID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	taskGroup := TaskGroupModel{}
	err = s.db.First(&taskGroup, taskGroupID).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	if taskGroup.State != TaskGroupStateRunning {
		rest.Error(c, rest.ErrBadRequest.New("Task is not running"))
		return
	}
	s.scheduler.AsyncAbort(uint(taskGroupID))
	c.JSON(http.StatusOK, rest.EmptyResponse{})
}

// @Summary Delete a log search task group
// @Param id path string true "task group id"
// @Security JwtAuth
// @Success 200 {object} rest.EmptyResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
// @Router /logs/taskgroups/{id} [delete]
func (s *Service) DeleteTaskGroup(c *gin.Context) {
	taskGroupID := c.Param("id")
	taskGroup := TaskGroupModel{}
	err := s.db.Where("id = ? AND state != ?", taskGroupID, TaskGroupStateRunning).First(&taskGroup).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	taskGroup.Delete(s.db)
	c.JSON(http.StatusOK, rest.EmptyResponse{})
}

// @Summary Generate a download token for downloading logs
// @Produce plain
// @Param id query []string false "task id" collectionFormat(csv)
// @Security JwtAuth
// @Success 200 {string} string "xxx"
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Router /logs/download/acquire_token [get]
func (s *Service) GetDownloadToken(c *gin.Context) {
	ids := c.QueryArray("id")
	str := strings.Join(ids, ",")
	token, err := utils.NewJWTString("logs/download", str)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.String(http.StatusOK, token)
}

// @Summary Download logs
// @Produce application/x-tar,application/zip
// @Param token query string true "download token"
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
// @Router /logs/download [get]
func (s *Service) DownloadLogs(c *gin.Context) {
	token := c.Query("token")
	str, err := utils.ParseJWTString("logs/download", token)
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
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
		rest.Error(c, rest.ErrBadRequest.New("Expect at least 1 target"))
	case 1:
		serveTaskForDownload(tasks[0], c)
	default:
		serveMultipleTaskForDownload(tasks, c)
	}
}
