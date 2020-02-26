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
	"archive/tar"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
)

func packLogsAsTarball(tasks []*TaskModel, w io.Writer) error {
	tw := tar.NewWriter(w)
	defer tw.Close()
	for _, task := range tasks {
		if task.LogStorePath == nil {
			continue
		}
		err := dumpLog(*task.LogStorePath, tw)
		if err != nil {
			return err
		}
	}
	return nil
}

func dumpLog(savedPath string, tw *tar.Writer) error {
	f, err := os.Open(savedPath)
	if err != nil {
		return err
	}
	defer f.Close()
	fi, err := f.Stat()
	if err != nil {
		return err
	}
	err = tw.WriteHeader(&tar.Header{
		Name:    path.Base(savedPath),
		Mode:    int64(fi.Mode()),
		ModTime: fi.ModTime(),
		Size:    fi.Size(),
	})
	if err != nil {
		return err
	}

	_, err = io.Copy(tw, f)
	if err != nil {
		return err
	}
	return nil
}

func serveTaskForDownload(task *TaskModel, c *gin.Context) {
	if task.LogStorePath == nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(utils.ErrInvalidRequest.New("Log is not available for this task"))
		return
	}

	f, err := os.Open(*task.LogStorePath)
	if err != nil {
		_ = c.Error(err)
		return
	}
	stat, err := f.Stat()
	if err != nil {
		_ = c.Error(err)
		return
	}

	contentType := "application/zip"
	extraHeaders := map[string]string{
		"Content-Disposition": fmt.Sprintf(`attachment; filename="%s"`, stat.Name()),
	}

	c.DataFromReader(http.StatusOK, -1, contentType, f, extraHeaders)
}

func serveMultipleTaskForDownload(tasks []*TaskModel, c *gin.Context) {
	reader, writer := io.Pipe()
	go func() {
		err := packLogsAsTarball(tasks, writer)
		defer writer.Close() //nolint:errcheck
		if err != nil {
			log.Warn("Pack log failed", zap.Error(err))
		}
	}()
	contentType := "application/tar"
	extraHeaders := map[string]string{
		"Content-Disposition": `attachment; filename="logs.tar"`,
	}
	c.DataFromReader(http.StatusOK, -1, contentType, reader, extraHeaders)
}
