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
	"archive/zip"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
)

func serveTaskForDownload(task *TaskModel, c *gin.Context) {
	logPath := task.LogStorePath
	if logPath == nil {
		logPath = task.SlowLogStorePath
	}
	if logPath == nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(utils.ErrInvalidRequest.New("Log is not available"))
		return
	}
	c.FileAttachment(*logPath, fmt.Sprintf("logs-%s.zip", task.Target.FileName()))
}

func serveMultipleTaskForDownload(tasks []*TaskModel, c *gin.Context) {
	// ref: https://stackoverflow.com/a/57434338/2998877
	c.Writer.Header().Set("Content-type", "application/octet-stream")
	c.Writer.Header().Set("Content-Disposition", "attachment; filename=logs.zip")
	c.Stream(func(w io.Writer) bool {
		ar := zip.NewWriter(w)
		defer ar.Close()

		for _, task := range tasks {
			logPath := task.LogStorePath
			if logPath == nil {
				logPath = task.SlowLogStorePath
			}
			if logPath == nil {
				continue
			}
			file, err := os.Open(*logPath)
			if err != nil {
				log.Warn("Failed to open log",
					zap.Any("task", task),
					zap.Error(err))
				continue
			}
			defer file.Close()
			zipFile, _ := ar.Create(task.Target.FileName() + ".zip")
			_, err = io.Copy(zipFile, file)
			if err != nil {
				log.Warn("Failed to copy log",
					zap.Any("task", task),
					zap.Error(err))
				continue
			}
		}

		return false
	})
}
