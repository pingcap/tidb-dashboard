// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package logsearch

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/ziputil"
)

type taskDownload struct {
	task *TaskModel
	path string
}

func resolveTaskLogPath(task *TaskModel, logStoreDir *string) (string, error) {
	logPath := task.LogStorePath
	if logPath == nil {
		logPath = task.SlowLogStorePath
	}
	if logPath == nil {
		return "", fmt.Errorf("log is not ready")
	}
	if logStoreDir == nil {
		return "", fmt.Errorf("log store directory is not available")
	}
	return resolvePathWithinDirectory(*logStoreDir, *logPath)
}

func serveTaskForDownload(task taskDownload, c *gin.Context) {
	c.FileAttachment(task.path, fmt.Sprintf("logs-%s.zip", task.task.Target.FileName()))
}

func serveMultipleTaskForDownload(tasks []taskDownload, c *gin.Context) {
	filePaths := make([]string, 0, len(tasks))
	for _, task := range tasks {
		filePaths = append(filePaths, task.path)
	}

	c.Writer.Header().Set("Content-type", "application/octet-stream")
	c.Writer.Header().Set("Content-Disposition", "attachment; filename=\"logs.zip\"")
	err := ziputil.WriteZipFromFiles(c.Writer, filePaths, false)
	if err != nil {
		log.Error("Stream zip pack failed", zap.Error(err))
	}
}
