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

package profiling

import (
	"context"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

// Built-in component type
const (
	tikv = "tikv"
	tidb = "tidb"
	pd   = "pd"
)

// Service is used to provide a kind of feature.
type Service struct {
	config *config.Config
	db     *dbstore.DB
	tasks  sync.Map
}

// NewService creates a new service.
func NewService(config *config.Config, db *dbstore.DB) *Service {
	err := autoMigrate(db)
	if err != nil {
		log.Fatal("Failed to initialize database", zap.Error(err))
	}
	return &Service{config: config, db: db, tasks: sync.Map{}}
}

// Register register the handlers to the service.
func (s *Service) Register(r *gin.RouterGroup) {
	endpoint := r.Group("/profiling")
	endpoint.POST("/group/start", s.startHandler)
	endpoint.GET("/group/status/:groupId", s.statusHandler)
	endpoint.POST("/group/cancel/:groupId", s.cancelGroupHandler)
	endpoint.GET("/group/download/:groupId", s.downloadGroupHandler)
	endpoint.GET("/single/download/:taskId", s.downloadHandler)
	endpoint.DELETE("/group/delete/:groupId", s.deleteHandler)
}

type StartRequest struct {
	Tidb         []string `json:"tidb"`
	Tikv         []string `json:"tikv"`
	Pd           []string `json:"pd"`
	GrabInterval uint     `json:"grab-interval"`
}

// @Summary Create a task group
// @Description Create and run a task group
// @Produce json
// @Param pr body StartRequest true "profiling request"
// @Success 200 {object} TaskGroupModel "task group"
// @Failure 400 {object} utils.APIError
// @Router /profiling/group/start [post]
func (s *Service) startHandler(c *gin.Context) {
	var pr StartRequest
	if err := c.ShouldBindJSON(&pr); err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(err)
		return
	}

	taskGroup := NewTaskGroup()
	if err := s.db.Create(taskGroup.TaskGroupModel).Error; err != nil {
		_ = c.Error(err)
		return
	}
	addrs := map[string][]string{
		tidb: pr.Tidb,
		tikv: pr.Tikv,
		pd:   pr.Pd,
	}

	var tasks []*Task
	for component, addrs := range addrs {
		for _, addr := range addrs {
			t := NewTask(s.db, taskGroup.ID, pr.GrabInterval, component, addr)
			s.db.Create(t.TaskModel)
			ctx, cancel := context.WithCancel(context.Background())
			t.ctx = ctx
			t.cancel = cancel
			s.tasks.Store(t.ID, t)
			tasks = append(tasks, t)
		}
	}
	go func() {
		var wg sync.WaitGroup
		for i := 0; i < len(tasks); i++ {
			wg.Add(1)
			go func(idx int) {
				defer wg.Done()
				tasks[idx].run()
				s.tasks.Delete(tasks[idx].ID)
			}(i)
		}
		wg.Wait()
		taskGroup.State = TaskStateFinish
		s.db.Save(taskGroup.TaskGroupModel)
	}()

	c.JSON(http.StatusOK, taskGroup.TaskGroupModel)
}

type StatusResponse struct {
	ServerTime int64          `json:"server_time"`
	TaskGroup  TaskGroupModel `json:"task_group_status"`
	Tasks      []TaskModel    `json:"tasks_status"`
}

// @Summary List all tasks with a given group ID
// @Description List all profiling tasks with a given group ID
// @Produce json
// @Param groupId path string true "group ID"
// @Success 200 {object} StatusResponse
// @Failure 400 {object} utils.APIError
// @Router /profiling/group/status/{groupId} [get]
func (s *Service) statusHandler(c *gin.Context) {
	taskGroupID, err := strconv.Atoi(c.Param("groupId"))
	if err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(err)
		return
	}
	var taskGroup TaskGroupModel
	err = s.db.Where("id = ?", taskGroupID).Find(&taskGroup).Error
	if err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(err)
		return
	}

	var tasks []TaskModel
	err = s.db.Where("task_group_id = ?", taskGroupID).Find(&tasks).Error
	if err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusOK, StatusResponse{
		ServerTime: time.Now().Unix(),
		TaskGroup:  taskGroup,
		Tasks:      tasks,
	})
}

// @Summary Cancel all tasks with a given group ID
// @Description Cancel all profling tasks with a given group ID
// @Produce json
// @Param groupId path string true "group ID"
// @Success 200 {string} string "success"
// @Failure 400 {object} utils.APIError
// @Router /profiling/group/cancel/{groupId} [post]
func (s *Service) cancelGroupHandler(c *gin.Context) {
	taskGroupID, err := strconv.Atoi(c.Param("groupId"))
	if err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(err)
		return
	}
	var tasks []TaskModel
	err = s.db.Where("task_group_id = ? AND state = ?", taskGroupID, TaskStateRunning).Find(&tasks).Error
	if err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(err)
		return
	}

	for _, task := range tasks {
		if task, ok := s.tasks.Load(task.ID); ok {
			t := task.(*Task)
			t.stop()
		}
	}
	c.JSON(http.StatusOK, "success")
}

// @Summary Download all results with a given group ID
// @Description Download all finished profiling results with a given group ID
// @Produce application/x-gzip
// @Param groupId path string true "group ID"
// @Failure 400 {object} utils.APIError
// @Failure 500 {object} utils.APIError
// @Router /profiling/group/download/{groupId} [get]
func (s *Service) downloadGroupHandler(c *gin.Context) {
	taskGroupID, err := strconv.Atoi(c.Param("groupId"))
	if err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(err)
		return
	}
	var tasks []TaskModel
	err = s.db.Where("task_group_id = ? AND state = ?", taskGroupID, TaskStateFinish).Find(&tasks).Error
	if err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(err)
		return
	}

	filePathes := make([]string, len(tasks))
	for i, task := range tasks {
		filePathes[i] = task.FilePath
	}

	temp, err := ioutil.TempFile("", fmt.Sprintf("taskgroup_%d", taskGroupID))
	if err != nil {
		c.Status(http.StatusInternalServerError)
		_ = c.Error(err)
		return
	}

	err = createTarball(temp, filePathes)
	defer temp.Close()
	if err != nil {
		c.Status(http.StatusInternalServerError)
		_ = c.Error(err)
		return
	}

	fileName := fmt.Sprintf("profile_taskgroup_%d.tar.gz", taskGroupID)
	c.FileAttachment(temp.Name(), fileName)
}

// @Summary Download all results with a given group ID
// @Description Download all finished profiling results with a given group ID
// @Produce application/x-gzip
// @Param taskId path string true "task ID"
// @Failure 400 {object} utils.APIError
// @Failure 500 {object} utils.APIError
// @Router /profiling/single/download/{taskId} [get]
func (s *Service) downloadHandler(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(err)
		return
	}
	task := TaskModel{}
	err = s.db.Where("id = ? AND state = ?", taskID, TaskStateFinish).First(&task).Error
	if err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(err)
		return
	}

	temp, err := ioutil.TempFile("", fmt.Sprintf("task_%d", taskID))
	if err != nil {
		c.Status(http.StatusInternalServerError)
		_ = c.Error(err)
		return
	}

	err = createTarball(temp, []string{task.FilePath})
	defer temp.Close()
	if err != nil {
		c.Status(http.StatusInternalServerError)
		_ = c.Error(err)
		return
	}

	fileName := fmt.Sprintf("profile_task_%d.tar.gz", taskID)
	c.FileAttachment(temp.Name(), fileName)
}

// @Summary Delete all tasks with a given group ID
// @Description Delete all finished profiling tasks with a given group ID
// @Produce json
// @Param groupId path string true "group ID"
// @Success 200 {object} utils.APIEmptyResponse
// @Failure 400 {object} utils.APIError
// @Failure 500 {object} utils.APIError
// @Router /profiling/group/delete/{groupId} [delete]
func (s *Service) deleteHandler(c *gin.Context) {
	taskGroupID, err := strconv.Atoi(c.Param("groupId"))
	if err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(err)
		return
	}
	taskGroup := TaskGroupModel{}
	err = s.db.Where("id = ? AND state <> ?", taskGroupID, TaskStateRunning).Find(&taskGroup).Error
	if err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(err)
		return
	}

	err = s.db.Where("task_group_id = ?", taskGroupID).Delete(&TaskModel{}).Error
	if err != nil {
		c.Status(http.StatusInternalServerError)
		_ = c.Error(err)
		return
	}
	err = s.db.Where("id = ?", taskGroupID).Delete(&TaskGroupModel{}).Error
	if err != nil {
		c.Status(http.StatusInternalServerError)
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, utils.APIEmptyResponse{})
}
