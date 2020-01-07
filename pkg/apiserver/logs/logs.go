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

package logs

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/kvproto/pkg/diagnosticspb"
)

const defaultSearchLogDuration = 30 * time.Minute / time.Millisecond

// @Summary GetLogs
// @Description Get logs from TiDB, TiKV, PD
// @Accept json
// @Produce json
// @Param serverType path string true "Server type"
// @Success 200 {string} string
// @Router /logs/{serverType} [get]
func logsHandler(c *gin.Context) {
	serverType := c.Param("serverType")
	// TODO: using port provided by client
	var addr string
	switch serverType {
	case "tidb":
		addr = "127.0.0.1:10080"
	case "tikv":
		addr = "127.0.0.1:20160"
	case "pd":
		addr = "127.0.0.1:2379"
	}

	// TODO: using parameters provided by client
	endTime := time.Now().UnixNano() / int64(time.Millisecond)
	startTime := endTime - int64(defaultSearchLogDuration)

	var req = &diagnosticspb.SearchLogRequest{
		StartTime: startTime,
		EndTime:   endTime,
		Levels:    nil,
		Patterns:  nil,
	}
	resultCh, err := fetcher.fetchLogs(c, addr, req)
	if err != nil {
		c.String(http.StatusInternalServerError, err.Error())
		return
	}
	// TODO: paging logs result here
	result := <-resultCh
	if result.err != nil {
		c.String(http.StatusInternalServerError, result.err.Error())
		return
	}
	c.JSON(http.StatusOK, result.messages)
}

func RegisterService(r *gin.RouterGroup) {
	endpoint := r.Group("/logs")
	endpoint.GET("/:serverType", logsHandler)
}
