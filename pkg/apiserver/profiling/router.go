// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/util/rest"
	"github.com/pingcap/tidb-dashboard/util/ziputil"
)

// Register register the handlers to the service.
func RegisterRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/profiling")
	endpoint.GET("/group/list", auth.MWAuthRequired(), s.getGroupList)
	endpoint.POST("/group/start", auth.MWAuthRequired(), s.handleStartGroup)
	endpoint.GET("/group/detail/:groupId", auth.MWAuthRequired(), s.getGroupDetail)
	endpoint.POST("/group/cancel/:groupId", auth.MWAuthRequired(), s.handleCancelGroup)
	endpoint.DELETE("/group/delete/:groupId", auth.MWAuthRequired(), s.deleteGroup)

	endpoint.GET("/action_token", auth.MWAuthRequired(), s.getActionToken)
	endpoint.GET("/group/download", s.downloadGroup)
	endpoint.GET("/single/download", s.downloadSingle)
	endpoint.GET("/single/view", s.viewSingle)

	endpoint.GET("/config", auth.MWAuthRequired(), s.getDynamicConfig)
	endpoint.PUT("/config", auth.MWAuthRequired(), auth.MWRequireWritePriv(), s.setDynamicConfig)
}

// @ID startProfiling
// @Summary Start profiling
// @Description Start a profiling task group
// @Param req body StartRequest true "profiling request"
// @Security JwtAuth
// @Success 200 {object} TaskGroupModel "task group"
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
// @Router /profiling/group/start [post]
func (s *Service) handleStartGroup(c *gin.Context) {
	var req StartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	if len(req.Targets) == 0 {
		_ = c.Error(rest.ErrBadRequest.New("Expect at least 1 target"))
		return
	}

	if req.DurationSecs == 0 {
		req.DurationSecs = config.DefaultProfilingAutoCollectionDurationSecs
	}
	if req.DurationSecs > config.MaxProfilingAutoCollectionDurationSecs {
		req.DurationSecs = config.MaxProfilingAutoCollectionDurationSecs
	}

	session := &StartRequestSession{
		req: req,
		ch:  make(chan struct{}, 1),
	}
	s.sessionCh <- session
	select {
	case <-session.ch:
		if session.err != nil {
			_ = c.Error(session.err)
		} else {
			c.JSON(http.StatusOK, session.taskGroup.TaskGroupModel)
		}
	case <-time.After(Timeout):
		_ = c.Error(ErrTimeout.NewWithNoMessage())
	}
}

// @ID getProfilingGroups
// @Summary List all profiling groups
// @Description List all profiling groups
// @Security JwtAuth
// @Success 200 {array} TaskGroupModel
// @Failure 401 {object} rest.ErrorResponse
// @Router /profiling/group/list [get]
func (s *Service) getGroupList(c *gin.Context) {
	var resp []TaskGroupModel
	err := s.params.LocalStore.Order("id DESC").Find(&resp).Error
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

type ResponseTask struct {
	ID         uint                    `json:"id" gorm:"primary_key"`
	State      TaskState               `json:"state" gorm:"index"`
	Target     model.RequestTargetNode `json:"target" gorm:"embedded;embedded_prefix:target_"`
	Error      string                  `json:"error" gorm:"type:text"`
	StartedAt  int64                   `json:"started_at"` // The start running time, reset when retry. Used to estimate approximate profiling progress.
	IsProtobuf bool                    `json:"is_protobuf"`
}

type GroupDetailResponse struct {
	ServerTime int64          `json:"server_time"`
	TaskGroup  TaskGroupModel `json:"task_group_status"`
	Tasks      []ResponseTask `json:"tasks_status"`
}

// @ID getProfilingGroupDetail
// @Summary List all tasks with a given group ID
// @Description List all profiling tasks with a given group ID
// @Param groupId path string true "group ID"
// @Security JwtAuth
// @Success 200 {object} GroupDetailResponse
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Router /profiling/group/detail/{groupId} [get]
func (s *Service) getGroupDetail(c *gin.Context) {
	taskGroupID, err := strconv.Atoi(c.Param("groupId"))
	if err != nil {
		_ = c.Error(rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	var taskGroup TaskGroupModel
	err = s.params.LocalStore.Where("id = ?", taskGroupID).Find(&taskGroup).Error
	if err != nil {
		_ = c.Error(err)
		return
	}

	var tasks []TaskModel
	var responseTasks []ResponseTask
	err = s.params.LocalStore.Where("task_group_id = ?", taskGroupID).Find(&tasks).Error
	if err != nil {
		_ = c.Error(err)
		return
	}

	responseTasks = make([]ResponseTask, len(tasks))

	for i, task := range tasks {
		responseTasks[i].ID = task.ID
		responseTasks[i].State = task.State
		responseTasks[i].Target = task.Target
		responseTasks[i].Error = task.Error
		responseTasks[i].StartedAt = task.StartedAt
		responseTasks[i].IsProtobuf = task.IsProtobuf
	}

	c.JSON(http.StatusOK, GroupDetailResponse{
		ServerTime: time.Now().Unix(), // Used to estimate task progress
		TaskGroup:  taskGroup,
		Tasks:      responseTasks,
	})
}

// @ID cancelProfilingGroup
// @Summary Cancel all tasks with a given group ID
// @Description Cancel all profling tasks with a given group ID
// @Param groupId path string true "group ID"
// @Security JwtAuth
// @Success 200 {object} rest.EmptyResponse
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Router /profiling/group/cancel/{groupId} [post]
func (s *Service) handleCancelGroup(c *gin.Context) {
	taskGroupID, err := strconv.Atoi(c.Param("groupId"))
	if err != nil {
		_ = c.Error(rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	if err := s.cancelGroup(uint(taskGroupID)); err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, rest.EmptyResponse{})
}

// @ID getActionToken
// @Summary Get action token for download or view
// @Description Get token with a given group ID or task ID and action type
// @Produce plain
// @Param id query string false "group or task ID"
// @Param action query string false "action"
// @Security JwtAuth
// @Success 200 {string} string
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
// @Router /profiling/action_token [get]
func (s *Service) getActionToken(c *gin.Context) {
	id := c.Query("id")
	action := c.Query("action") // group_download, single_download, single_view
	token, err := utils.NewJWTString("profiling/"+action, id)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.String(http.StatusOK, token)
}

// @ID downloadProfilingGroup
// @Summary Download all results of a task group
// @Description Download all finished profiling results of a task group
// @Produce application/x-gzip
// @Param token query string true "download token"
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
// @Router /profiling/group/download [get]
func (s *Service) downloadGroup(c *gin.Context) {
	token := c.Query("token")
	str, err := utils.ParseJWTString("profiling/group_download", token)
	if err != nil {
		_ = c.Error(rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	taskGroupID, err := strconv.Atoi(str)
	if err != nil {
		_ = c.Error(rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	var tasks []TaskModel
	err = s.params.LocalStore.Where("task_group_id = ? AND state = ?", taskGroupID, TaskStateFinish).Find(&tasks).Error
	if err != nil {
		_ = c.Error(err)
		return
	}

	filePathes := make([]string, len(tasks))
	for i, task := range tasks {
		filePathes[i] = task.FilePath
	}

	fileName := fmt.Sprintf("profiling_pack_%d.zip", taskGroupID)
	c.Writer.Header().Set("Content-type", "application/octet-stream")
	c.Writer.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
	err = ziputil.WriteZipFromFiles(c.Writer, filePathes, true)
	if err != nil {
		log.Error("Stream zip pack failed", zap.Error(err))
	}
}

// @ID downloadProfilingSingle
// @Summary Download the result of a task
// @Description Download the finished profiling result of a task
// @Produce application/x-gzip
// @Param token query string true "download token"
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
// @Router /profiling/single/download [get]
func (s *Service) downloadSingle(c *gin.Context) {
	// FIXME: We can simply provide only a single file
	token := c.Query("token")
	str, err := utils.ParseJWTString("profiling/single_download", token)
	if err != nil {
		_ = c.Error(rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	taskID, err := strconv.Atoi(str)
	if err != nil {
		_ = c.Error(rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	task := TaskModel{}
	err = s.params.LocalStore.Where("id = ? AND state = ?", taskID, TaskStateFinish).First(&task).Error
	if err != nil {
		_ = c.Error(err)
		return
	}

	fileName := fmt.Sprintf("profiling_%d.zip", taskID)
	c.Writer.Header().Set("Content-type", "application/octet-stream")
	c.Writer.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
	err = ziputil.WriteZipFromFiles(c.Writer, []string{task.FilePath}, true)
	if err != nil {
		log.Error("Stream zip pack failed", zap.Error(err))
	}
}

// @ID viewProfilingSingle
// @Summary View the result of a task
// @Description View the finished profiling result of a task
// @Produce html
// @Param token query string true "download token"
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
// @Router /profiling/single/view [get]
func (s *Service) viewSingle(c *gin.Context) {
	token := c.Query("token")
	str, err := utils.ParseJWTString("profiling/single_view", token)
	if err != nil {
		_ = c.Error(rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	taskID, err := strconv.Atoi(str)
	if err != nil {
		_ = c.Error(rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	task := TaskModel{}
	err = s.params.LocalStore.Where("id = ? AND state = ?", taskID, TaskStateFinish).First(&task).Error
	if err != nil {
		_ = c.Error(err)
		return
	}

	content, err := ioutil.ReadFile(task.FilePath)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.Data(http.StatusOK, "image/svg+xml", content)
}

// @ID deleteProfilingGroup
// @Summary Delete all tasks with a given group ID
// @Description Delete all finished profiling tasks with a given group ID
// @Param groupId path string true "group ID"
// @Security JwtAuth
// @Success 200 {object} rest.EmptyResponse
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
// @Router /profiling/group/delete/{groupId} [delete]
func (s *Service) deleteGroup(c *gin.Context) {
	taskGroupID, err := strconv.Atoi(c.Param("groupId"))
	if err != nil {
		_ = c.Error(rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	if err := s.cancelGroup(uint(taskGroupID)); err != nil {
		_ = c.Error(err)
		return
	}

	if err = s.params.LocalStore.Where("task_group_id = ?", taskGroupID).Delete(&TaskModel{}).Error; err != nil {
		_ = c.Error(err)
		return
	}
	if err = s.params.LocalStore.Where("id = ?", taskGroupID).Delete(&TaskGroupModel{}).Error; err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, rest.EmptyResponse{})
}

// @Summary Get Profiling Dynamic Config
// @Success 200 {object} config.ProfilingConfig
// @Router /profiling/config [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) getDynamicConfig(c *gin.Context) {
	dc, err := s.params.ConfigManager.Get()
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, dc.Profiling)
}

// @Summary Set Profiling Dynamic Config
// @Param request body config.ProfilingConfig true "Request body"
// @Success 200 {object} config.ProfilingConfig
// @Router /profiling/config [put]
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) setDynamicConfig(c *gin.Context) {
	var req config.ProfilingConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	var opt config.DynamicConfigOption = func(dc *config.DynamicConfig) {
		dc.Profiling = req
	}
	if err := s.params.ConfigManager.Modify(opt); err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, req)
}
