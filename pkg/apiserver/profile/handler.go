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
)

// Built-in component type
const (
	tikv = "tikv"
	tidb = "tidb"
	pd   = "pd"
)

// ProfilingRequest defines the
type ProfilingRequest struct {
	Tidb []string `form:"tidb" json:"tidb"`
	Tikv []string `form:"tikv" json:"tikv"`
	Pd   []string `form:"pd" json:"pd"`
}

// @Summary Create a task group
// @Description create and run a task group
// @Produce json
// @Param pr query profile.ProfilingRequest true "profiling request"
// @Success 200 {string} string "group ID"
// @Failure 400 {object} utils.APIError
// @Router /profile/group/start [post]
func (s *Service) startHandler(c *gin.Context) {
	var pr ProfilingRequest
	if err := c.ShouldBind(&pr); err != nil {
		c.Status(400)
		_ = c.Error(err)
		return
	}

	tg := NewTaskGroup()
	addrs := map[string][]string{
		tidb: pr.Tidb,
		tikv: pr.Tikv,
		pd:   pr.Pd,
	}
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
// @Param groupId path string true "group ID"
// @Success 200 {array} TaskModel
// @Failure 400 {object} utils.APIError
// @Router /profile/group/status/{groupId} [get]
func (s *Service) statusHandler(c *gin.Context) {
	taskGroupID := c.Param("groupId")
	var tasks []TaskModel
	s.db.Find(&tasks)
	err := s.db.Where("task_group_id = ?", taskGroupID).Find(&tasks).Error
	if err != nil {
		c.Status(400)
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, tasks)
}

// @Summary Cancel all tasks with a given group ID
// @Description Cancel all profling tasks with a given group ID
// @Produce json
// @Param groupId path string true "group ID"
// @Success 200 {string} string "success"
// @Failure 400 {object} utils.APIError
// @Router /profile/group/cancel/{groupId} [post]
func (s *Service) cancelGroupHandler(c *gin.Context) {
	taskGroupID := c.Param("groupId")
	taskGroup := TaskGroupModel{}
	err := s.db.Where("id = ?", taskGroupID).First(&taskGroup).Error
	if err != nil {
		c.Status(400)
		_ = c.Error(err)
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
	c.JSON(http.StatusOK, "success")
}

// @Summary Cancel a single task with a given task ID
// @Description Cancel a single profling task with a given task ID
// @Produce json
// @Param taskId path string true "task ID"
// @Success 200 {string} string "success"
// @Failure 400 {object} utils.APIError
// @Failure 500 {object} utils.APIError
// @Router /profile/single/cancel/{taskId} [post]
func (s *Service) cancelHandler(c *gin.Context) {
	taskID := c.Param("taskId")
	task := TaskModel{}
	err := s.db.Where("id = ?", taskID).First(&task).Error
	if err != nil {
		c.Status(400)
		_ = c.Error(err)
		return
	}

	if task, ok := s.tasks.Load(task.ID); ok {
		t := task.(*Task)
		taskGroup := TaskGroupModel{}
		err := s.db.Where("id = ?", t.TaskGroupID).First(&taskGroup).Error
		if err != nil {
			c.Status(500)
			_ = c.Error(err)
			return
		}
		if t.State == Running {
			t.stop()
			taskGroup.RunningTasks--
			s.db.Save(&taskGroup)
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
// @Router /profile/group/download/{groupId} [get]
func (s *Service) downloadGroupHandler(c *gin.Context) {
	taskGroupID := c.Param("groupId")
	taskGroup := TaskGroupModel{}
	err := s.db.Where("id = ?", taskGroupID).First(&taskGroup).Error
	if err != nil {
		c.Status(400)
		_ = c.Error(err)
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
		c.Status(500)
		_ = c.Error(err)
		return
	}

	err = createTarball(temp, filePathes)
	defer temp.Close()
	if err != nil {
		c.Status(500)
		_ = c.Error(err)
		return
	}

	fileName := fmt.Sprintf("taskgroup_%s.tar.gz", taskGroupID)
	c.FileAttachment(temp.Name(), fileName)
}

// @Summary Download all results with a given group ID
// @Description Download all finished profiling results with a given group ID
// @Produce application/x-gzip
// @Param taskId path string true "task ID"
// @Failure 400 {object} utils.APIError
// @Failure 500 {object} utils.APIError
// @Router /profile/single/download/{taskId} [get]
func (s *Service) downloadHandler(c *gin.Context) {
	taskID := c.Param("taskId")
	task := TaskModel{}
	err := s.db.Where("id = ?", taskID).First(&task).Error
	if err != nil {
		c.Status(400)
		_ = c.Error(err)
		return
	}
	if task.State != Finish {
		c.Status(400)
		_ = c.Error(err)
		return
	}

	temp, err := ioutil.TempFile("", fmt.Sprintf("task_%s", taskID))
	if err != nil {
		c.Status(500)
		_ = c.Error(err)
		return
	}

	err = createTarball(temp, []string{task.FilePath})
	defer temp.Close()
	if err != nil {
		c.Status(500)
		_ = c.Error(err)
		return
	}

	fileName := fmt.Sprintf("task_%s.tar.gz", taskID)
	c.FileAttachment(temp.Name(), fileName)
}

// @Summary Delete all tasks with a given group ID
// @Description Delete all finished profiling tasks with a given group ID
// @Produce json
// @Param groupId path string true "group ID"
// @Success 200 {string} string "success"
// @Failure 400 {object} utils.APIError
// @Failure 500 {object} utils.APIError
// @Router /profile/group/delete/{groupId} [delete]
func (s *Service) deleteHandler(c *gin.Context) {
	taskGroupID := c.Param("groupId")
	taskGroup := TaskGroupModel{}
	err := s.db.Where("id = ?", taskGroupID).Find(&taskGroup).Error
	if err != nil {
		c.Status(400)
		_ = c.Error(err)
		return
	}
	if taskGroup.State == Running {
		err := fmt.Errorf("failed to delete, task group [%s] is running", taskGroupID)
		c.Status(400)
		_ = c.Error(err)
		return
	}

	err = s.db.Where("task_group_id = ?", taskGroupID).Delete(&TaskModel{}).Error
	if err != nil {
		c.Status(500)
		_ = c.Error(err)
		return
	}
	err = s.db.Where("id = ?", taskGroupID).Delete(&TaskGroupModel{}).Error
	if err != nil {
		c.Status(500)
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, "success")
}
