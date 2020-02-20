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

package profile

import (
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/httputil"
)

// Built-in component type
const (
	tikv = "tikv"
	tidb = "tidb"
	pd   = "pd"
)

// @Summary Create a task group
// @Description create and run a task group
// @Produce json
// @Param tikv query string false "tikv"
// @Param tidb query string false "tidb"
// @Param pd query string false "pd"
// @Success 200 {object} httputil.HTTPSuccess
// @Router /profile/group/start [get]
func (s *Service) startHandler(c *gin.Context) {
	tg := NewTaskGroup()
	addrs := make(map[string][]string)
	addrs[tidb] = c.QueryArray(tidb)
	addrs[tikv] = c.QueryArray(tikv)
	addrs[pd] = c.QueryArray(pd)
	var count int
	for component, addrs := range addrs {
		for _, addr := range addrs {
			t := NewTask(s.db, component, addr, tg.ID)
			s.tasks.Store(t.ID, t)
			s.db.Save(t.TaskModel)
			count++
		}
	}
	s.tasks.Range(func(key, value interface{}) bool {
		task, ok := value.(*Task)
		if !ok {
			log.Warn(fmt.Sprintf("cannot load %+v as *Task", value))
			return true
		}
		if task.TaskGroupID != tg.ID {
			return true
		}

		tg.RunningTasks++
		go func() {
			task.run(tg.updateCh)
		}()
		return true
	})
	tg.State = Running
	s.db.Save(tg.TaskGroupModel)

	go tg.trackTasks(s.db, &s.tasks)
	c.JSON(http.StatusOK, tg.ID)
}

// @Summary List all tasks with a given group ID
// @Description list all profling tasks with a given group ID
// @Produce json
// @Param groupId path string true "group id"
// @Success 200 {array} TaskModel
// @Failure 400 {object} httputil.HTTPError
// @Router /profile/group/status/{groupId} [get]
func (s *Service) statusHandler(c *gin.Context) {
	taskGroupID := c.Param("groupId")
	var tasks []TaskModel
	s.db.Debug().Find(&tasks)
	err := s.db.Debug().Where("task_group_id = ?", taskGroupID).Find(&tasks).Error
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	c.JSON(http.StatusOK, tasks)
}

// @Summary Cancel all tasks with a given group ID
// @Description Cancel all profling tasks with a given group ID
// @Produce json
// @Param groupId path string true "group id"
// @Success 200 {object} httputil.HTTPSuccess
// @Failure 400 {object} httputil.HTTPError
// @Router /profile/group/cancel/{groupId} [post]
func (s *Service) cancelGroupHandler(c *gin.Context) {
	taskGroupID := c.Param("groupId")
	taskGroup := TaskGroupModel{}
	err := s.db.Where("id = ?", taskGroupID).First(&taskGroup).Error
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	s.tasks.Range(func(key, value interface{}) bool {
		task, ok := value.(*Task)
		if !ok {
			log.Warn(fmt.Sprintf("cannot load %+v as *Task", value))
			return true
		}
		if task.TaskGroupID != taskGroupID {
			return true
		}
		if task.State == Running {
			task.stop()
			taskGroup.RunningTasks--
		}
		return true
	})
	s.db.Save(&taskGroup)
	httputil.Success(c)
}

// @Summary Cancel a single task with a given task ID
// @Description Cancel a single profling task with a given task ID
// @Produce json
// @Param taskId path string true "task id"
// @Success 200 {object} httputil.HTTPSuccess
// @Failure 400 {object} httputil.HTTPError
// @Failure 500 {object} httputil.HTTPError
// @Router /profile/single/cancel/{taskId} [post]
func (s *Service) cancelHandler(c *gin.Context) {
	taskID := c.Param("taskId")
	task := TaskModel{}
	err := s.db.Where("id = ?", taskID).First(&task).Error
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}

	if task, ok := s.tasks.Load(task.ID); ok {
		t := task.(*Task)
		taskGroup := TaskGroupModel{}
		err := s.db.Where("id = ?", t.TaskGroupID).First(&taskGroup).Error
		if err != nil {
			httputil.NewError(c, http.StatusInternalServerError, err)
			return
		}
		if t.State == Running {
			t.stop()
			taskGroup.RunningTasks--
			s.db.Save(&taskGroup)
		}
	}
	httputil.Success(c)
}

// @Summary Download all results with a given group ID
// @Description Download all finished profiling results with a given group ID
// @Produce application/tar
// @Param groupId path string true "group id"
// @Failure 400 {object} httputil.HTTPError
// @Failure 500 {object} httputil.HTTPError
// @Router /profile/group/download/{groupId} [get]
func (s *Service) downloadGroupHandler(c *gin.Context) {
	taskGroupID := c.Param("groupId")
	taskGroup := TaskGroupModel{}
	err := s.db.Where("id = ?", taskGroupID).First(&taskGroup).Error
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	var filePathes []string
	s.tasks.Range(func(key, value interface{}) bool {
		task, ok := value.(*Task)
		if !ok {
			log.Warn(fmt.Sprintf("cannot load %+v as *Task", value))
			return true
		}
		if task.TaskGroupID != taskGroupID {
			return true
		}
		if task.State == Finish {
			filePathes = append(filePathes, task.FilePath)
		}
		return true
	})

	temp, err := ioutil.TempFile("", fmt.Sprintf("taskgroup_%s", taskGroupID))
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}
	err = createTarball(temp, filePathes)
	defer temp.Close()
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}

	fileName := fmt.Sprintf("taskgroup_%s.tar.gz", taskGroupID)
	c.FileAttachment(temp.Name(), fileName)
}

// @Summary Download all results with a given group ID
// @Description Download all finished profiling results with a given group ID
// @Produce application/zip
// @Param taskId path string true "task id"
// @Failure 400 {object} httputil.HTTPError
// @Failure 500 {object} httputil.HTTPError
// @Router /profile/single/download/{taskId} [get]
func (s *Service) downloadHandler(c *gin.Context) {
	taskID := c.Param("taskId")
	task := TaskModel{}
	err := s.db.Where("id = ?", taskID).First(&task).Error
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}

	if task.State != Finish {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	temp, err := ioutil.TempFile("", fmt.Sprintf("task_%s", taskID))
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}
	err = createTarball(temp, []string{task.FilePath})
	defer temp.Close()
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}

	fileName := fmt.Sprintf("task_%s.tar.gz", taskID)
	c.FileAttachment(temp.Name(), fileName)
}
