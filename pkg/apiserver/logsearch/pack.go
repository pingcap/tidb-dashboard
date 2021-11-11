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

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

func serveTaskForDownload(task *TaskModel, c *gin.Context) {
	logPath := task.LogStorePath
	if logPath == nil {
		logPath = task.SlowLogStorePath
	}
	if logPath == nil {
		_ = c.Error(rest.ErrBadRequest.New("Log is not ready"))
		return
	}
	c.FileAttachment(*logPath, fmt.Sprintf("logs-%s.zip", task.Target.FileName()))
}

func serveMultipleTaskForDownload(tasks []*TaskModel, c *gin.Context) {
	filePaths := make([]string, 0, len(tasks))
	for _, task := range tasks {
		logPath := task.LogStorePath
		if logPath == nil {
			logPath = task.SlowLogStorePath
		}
		if logPath == nil {
			_ = c.Error(rest.ErrBadRequest.New("Some logs are not available"))
			return
		}
		filePaths = append(filePaths, *logPath)
	}

	c.Writer.Header().Set("Content-type", "application/octet-stream")
	c.Writer.Header().Set("Content-Disposition", "attachment; filename=\"logs.zip\"")
	err := utils.StreamZipPack(c.Writer, filePaths, false)
	if err != nil {
		log.Error("Stream zip pack failed", zap.Error(err))
	}
}
