// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package logsearch

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/rest"
	"github.com/pingcap/tidb-dashboard/util/ziputil"
)

func serveTaskForDownload(task *TaskModel, c *gin.Context) {
	logPath := task.LogStorePath
	if logPath == nil {
		logPath = task.SlowLogStorePath
	}
	if logPath == nil {
		rest.Error(c, rest.ErrBadRequest.New("Log is not ready"))
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
			rest.Error(c, rest.ErrBadRequest.New("Some logs are not available"))
			return
		}
		filePaths = append(filePaths, *logPath)
	}

	c.Writer.Header().Set("Content-type", "application/octet-stream")
	c.Writer.Header().Set("Content-Disposition", "attachment; filename=\"logs.zip\"")
	err := ziputil.WriteZipFromFiles(c.Writer, filePaths, false)
	if err != nil {
		log.Error("Stream zip pack failed", zap.Error(err))
	}
}
