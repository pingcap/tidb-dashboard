// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"archive/zip"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/util/rest"
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
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	if len(req.Targets) == 0 {
		rest.Error(c, rest.ErrBadRequest.New("Expect at least 1 target"))
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
			rest.Error(c, session.err)
		} else {
			c.JSON(http.StatusOK, session.taskGroup.TaskGroupModel)
		}
	case <-time.After(Timeout):
		rest.Error(c, ErrTimeout.NewWithNoMessage())
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
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

type GroupDetailResponse struct {
	ServerTime int64          `json:"server_time"`
	TaskGroup  TaskGroupModel `json:"task_group_status"`
	Tasks      []TaskModel    `json:"tasks_status"`
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
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	var taskGroup TaskGroupModel
	err = s.params.LocalStore.Where("id = ?", taskGroupID).Find(&taskGroup).Error
	if err != nil {
		rest.Error(c, err)
		return
	}

	var tasks []TaskModel
	err = s.params.LocalStore.Where("task_group_id = ?", taskGroupID).Find(&tasks).Error
	if err != nil {
		rest.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, GroupDetailResponse{
		ServerTime: time.Now().Unix(), // Used to estimate task progress
		TaskGroup:  taskGroup,
		Tasks:      tasks,
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
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	if err := s.cancelGroup(uint(taskGroupID)); err != nil {
		rest.Error(c, err)
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
		rest.Error(c, err)
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
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	taskGroupID, err := strconv.Atoi(str)
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	var tasks []TaskModel
	err = s.params.LocalStore.Where("task_group_id = ? AND state = ?", taskGroupID, TaskStateFinish).Find(&tasks).Error
	if err != nil {
		rest.Error(c, err)
		return
	}

	filePathes := make([]string, len(tasks))
	for i, task := range tasks {
		filePathes[i] = task.FilePath
	}

	fileName := fmt.Sprintf("profiling_%s.zip", time.Now().Format("2006-01-02_15-04-05"))
	c.Writer.Header().Set("Content-type", "application/octet-stream")
	c.Writer.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
	zw := zip.NewWriter(c.Writer)
	defer func() {
		_ = zw.Close()
	}()

	err = writeZipFromFiles(zw, filePathes, true)
	if err != nil {
		rest.Error(c, err)
		return
	}

	err = zipREADME(zw)
	if err != nil {
		rest.Error(c, err)
		return
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
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	taskID, err := strconv.Atoi(str)
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	task := TaskModel{}
	err = s.params.LocalStore.Where("id = ? AND state = ?", taskID, TaskStateFinish).First(&task).Error
	if err != nil {
		rest.Error(c, err)
		return
	}

	fileName := fmt.Sprintf("profiling_%s.zip", time.Now().Format("2006-01-02_15-04-05"))
	c.Writer.Header().Set("Content-type", "application/octet-stream")
	c.Writer.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
	zw := zip.NewWriter(c.Writer)
	defer func() {
		_ = zw.Close()
	}()

	err = writeZipFromFiles(zw, []string{task.FilePath}, true)
	if err != nil {
		rest.Error(c, err)
		return
	}

	err = zipREADME(zw)
	if err != nil {
		rest.Error(c, err)
		return
	}
}

func writeZipFromFiles(zw *zip.Writer, files []string, compress bool) error {
	for _, file := range files {
		err := writeZipFromFile(zw, file, compress)
		if err != nil {
			return err
		}
	}
	return nil
}

func writeZipFromFile(zw *zip.Writer, file string, compress bool) error {
	f, err := os.Open(filepath.Clean(file))
	if err != nil {
		return err
	}
	defer func() {
		_ = f.Close()
	}()

	fileInfo, err := f.Stat()
	if err != nil {
		return err
	}

	zipMethod := zip.Store // no compress
	if compress {
		zipMethod = zip.Deflate // compress
	}
	zipFile, err := zw.CreateHeader(&zip.FileHeader{
		Name:     fileInfo.Name(),
		Method:   zipMethod,
		Modified: time.Now(),
	})
	if err != nil {
		return err
	}

	_, err = io.Copy(zipFile, f)
	if err != nil {
		return err
	}

	return nil
}

func zipREADME(zw *zip.Writer) error {
	const downloadREADME = `
To review the CPU profiling or go heap profiling result interactively:
$ go tool pprof --http=0.0.0.0:1234 cpu_xxx.proto

To review the jemalloc profile data whose file name suffix is '.prof' interactively:
$ jeprof --web profile_xxx.prof
`
	zipFile, err := zw.CreateHeader(&zip.FileHeader{
		Name:     "README.md",
		Method:   zip.Deflate,
		Modified: time.Now(),
	})
	if err != nil {
		return err
	}

	_, err = zipFile.Write([]byte(downloadREADME))
	if err != nil {
		return err
	}
	return nil
}

type ViewOutputType string

const (
	ViewOutputTypeProtobuf ViewOutputType = "protobuf"
	ViewOutputTypeGraph    ViewOutputType = "graph"
	ViewOutputTypeText     ViewOutputType = "text"
)

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
	outputType := c.Query("output_type")
	str, err := utils.ParseJWTString("profiling/single_view", token)
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	taskID, err := strconv.Atoi(str)
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	task := TaskModel{}
	err = s.params.LocalStore.Where("id = ? AND state = ?", taskID, TaskStateFinish).First(&task).Error
	if err != nil {
		rest.Error(c, err)
		return
	}

	content, err := os.ReadFile(task.FilePath)
	if err != nil {
		rest.Error(c, err)
		return
	}

	// set default content-type for legacy profiling content.
	contentType := "image/svg+xml"

	if task.RawDataType == RawDataTypeProtobuf {
		switch outputType {
		case string(ViewOutputTypeGraph):
			svgContent, err := convertProtobufToSVG(content, task)
			if err != nil {
				rest.Error(c, err)
				return
			}
			content = svgContent
			contentType = "image/svg+xml"
		case string(ViewOutputTypeProtobuf):
			contentType = "application/protobuf"
		default:
			// Will not handle converting protobuf to other formats except flamegraph and graph
			rest.Error(c, rest.ErrBadRequest.New("Cannot output protobuf as %s", outputType))
			return
		}
	} else if task.RawDataType == RawDataTypeJeprof {
		// call jeprof to convert svg
		switch outputType {
		case string(ViewOutputTypeGraph):
			cmd := exec.Command("perl", "/dev/stdin", "--dot", task.FilePath) //nolint:gosec
			cmd.Stdin = strings.NewReader(jeprof)
			dotContent, err := cmd.Output()
			if err != nil {
				rest.Error(c, err)
				return
			}
			svgContent, err := convertDotToSVG(dotContent)
			if err != nil {
				rest.Error(c, err)
				return
			}
			content = svgContent
			contentType = "image/svg+xml"
		case string(ViewOutputTypeText):
			// Brendan Gregg's collapsed stack format
			cmd := exec.Command("perl", "/dev/stdin", "--collapsed", task.FilePath) //nolint:gosec
			cmd.Stdin = strings.NewReader(jeprof)
			textContent, err := cmd.Output()
			if err != nil {
				rest.Error(c, err)
				return
			}
			content = textContent
			contentType = "text/plain"
		default:
			// Will not handle converting jeprof raw data to other formats except flamegraph and graph
			rest.Error(c, rest.ErrBadRequest.New("Cannot output jeprof raw data as %s", outputType))
			return
		}
	} else if task.RawDataType == RawDataTypeText {
		switch outputType {
		case string(ViewOutputTypeText):
			contentType = "text/plain"
		default:
			// Will not handle converting text to other formats
			rest.Error(c, rest.ErrBadRequest.New("Cannot output text as %s", outputType))
			return
		}
	}
	c.Data(http.StatusOK, contentType, content)
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
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	if err := s.cancelGroup(uint(taskGroupID)); err != nil {
		rest.Error(c, err)
		return
	}

	if err = s.params.LocalStore.Where("task_group_id = ?", taskGroupID).Delete(&TaskModel{}).Error; err != nil {
		rest.Error(c, err)
		return
	}
	if err = s.params.LocalStore.Where("id = ?", taskGroupID).Delete(&TaskGroupModel{}).Error; err != nil {
		rest.Error(c, err)
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
		rest.Error(c, err)
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
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	var opt config.DynamicConfigOption = func(dc *config.DynamicConfig) {
		dc.Profiling = req
	}
	if err := s.params.ConfigManager.Modify(opt); err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, req)
}
