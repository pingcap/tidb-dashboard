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
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/httputil"
	"github.com/pingcap/log"
)

// Built-in component type
const (
	tikv = "tikv"
	tidb = "tidb"
	pd   = "pd"
)

func (s *Service) startHandler(c *gin.Context) {
	tg := NewTaskGroup()
	addrs := make(map[string][]string)
	addrs[tidb] = c.QueryArray(tidb)
	addrs[tikv] = c.QueryArray(tikv)
	addrs[pd] = c.QueryArray(pd)
	for component, addrs := range addrs {
		for _, addr := range addrs {
			t := NewTask(component, addr)
			s.tasks.Store(t.ID, t)
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
		go func() {
			task.run(tg.updateCh)
			tg.RunningTasks++
		}()
		return true
	})
	tg.State = Running
	s.db.Save(tg)

	go tg.trackTasks(s.db, &s.tasks)
	httputil.Success(c)
}

func (s *Service) statusHandler(c *gin.Context) {
	taskGroupID := c.Param("id")
	var tasks []TaskModel
	err := s.db.Where("task_group_id = ?", taskGroupID).Find(&tasks).Error
	if err != nil {
		httputil.NewError(c, http.StatusBadRequest, err)
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func (s *Service) cancelGroupHandler(c *gin.Context) {
	taskGroupID := c.Param("id")
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
	s.db.Save(taskGroup)
	httputil.Success(c)
}

func (s *Service) cancelHandler(c *gin.Context) {
	taskID := c.Param("id")
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
			s.db.Save(taskGroup)
		}
	}
	httputil.Success(c)
}

func (s *Service) downloadGroupHandler(c *gin.Context) {
	taskGroupID := c.Param("id")
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

	f, err := createTarball(taskGroupID, filePathes)
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}

	stat, err := f.Stat()
	if err != nil {
		httputil.NewError(c, http.StatusInternalServerError, err)
		return
	}
	contentLength := int64(-1)
	contentType := "application/tar"
	extraHeaders := map[string]string{
		"Content-Disposition": fmt.Sprintf(`attachment; filename="%s"`, stat.Name()),
	}
	c.DataFromReader(http.StatusOK, contentLength, contentType, f, extraHeaders)
}

func (s *Service) downloadHandler(c *gin.Context) {
	taskID := c.Param("id")
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
	f, err := os.Open(task.FilePath)
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
