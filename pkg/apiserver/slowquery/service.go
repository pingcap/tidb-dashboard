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

package slowquery

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"github.com/thoas/go-funk"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	commonUtils "github.com/pingcap/tidb-dashboard/pkg/utils"
	"github.com/pingcap/tidb-dashboard/util/rest/resterror"
)

var (
	ErrNS     = errorx.NewNamespace("error.api.slow_query")
	ErrNoData = ErrNS.NewType("export_no_data")
)

type ServiceParams struct {
	fx.In
	TiDBClient *tidb.Client
	SysSchema  *commonUtils.SysSchema
}

type Service struct {
	params ServiceParams
}

func newService(p ServiceParams) *Service {
	return &Service{params: p}
}

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/slow_query")
	{
		endpoint.GET("/download", s.downloadHandler)

		endpoint.Use(auth.MWAuthRequired())
		endpoint.Use(utils.MWConnectTiDB(s.params.TiDBClient))
		{
			endpoint.GET("/list", s.getList)
			endpoint.GET("/detail", s.getDetails)

			endpoint.POST("/download/token", s.downloadTokenHandler)

			endpoint.GET("/table_columns", s.queryTableColumns)
		}
	}
}

// @Summary List all slow queries
// @Param q query GetListRequest true "Query"
// @Success 200 {array} Model
// @Router /slow_query/list [get]
// @Security JwtAuth
// @Failure 400 {object} resterror.ErrorResponse
// @Failure 401 {object} resterror.ErrorResponse
func (s *Service) getList(c *gin.Context) {
	var req GetListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		_ = c.Error(resterror.ErrBadRequest.NewWithNoMessage())
		return
	}

	db := utils.GetTiDBConnection(c)
	results, err := s.querySlowLogList(db, &req)
	if err != nil {
		_ = c.Error(resterror.ErrBadRequest.NewWithNoMessage())
		return
	}
	c.JSON(http.StatusOK, results)
}

// @Summary Get details of a slow query
// @Param q query GetDetailRequest true "Query"
// @Success 200 {object} Model
// @Router /slow_query/detail [get]
// @Security JwtAuth
// @Failure 401 {object} resterror.ErrorResponse
func (s *Service) getDetails(c *gin.Context) {
	var req GetDetailRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		_ = c.Error(resterror.ErrBadRequest.NewWithNoMessage())
		return
	}

	db := utils.GetTiDBConnection(c)
	result, err := s.querySlowLogDetail(db, &req)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, *result)
}

// @Router /slow_query/download/token [post]
// @Summary Generate a download token for exported slow query statements
// @Produce plain
// @Param request body GetListRequest true "Request body"
// @Success 200 {string} string "xxx"
// @Security JwtAuth
// @Failure 400 {object} resterror.ErrorResponse
// @Failure 401 {object} resterror.ErrorResponse
func (s *Service) downloadTokenHandler(c *gin.Context) {
	var req GetListRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(resterror.ErrBadRequest.NewWithNoMessage())
		return
	}
	db := utils.GetTiDBConnection(c)
	fields := []string{}
	if strings.TrimSpace(req.Fields) != "" {
		fields = strings.Split(req.Fields, ",")
	}
	list, err := s.querySlowLogList(db, &req)
	if err != nil {
		_ = c.Error(resterror.ErrBadRequest.NewWithNoMessage())
		return
	}
	if len(list) == 0 {
		_ = c.Error(ErrNoData.NewWithNoMessage())
		return
	}

	// interface{} tricky
	rawData := make([]interface{}, len(list))
	for i, v := range list {
		rawData[i] = v
	}

	// convert data
	csvData := utils.GenerateCSVFromRaw(rawData, fields, []string{})

	// generate temp file that persist encrypted data
	timeLayout := "0102150405"
	beginTime := time.Unix(int64(req.BeginTime), 0).Format(timeLayout)
	endTime := time.Unix(int64(req.EndTime), 0).Format(timeLayout)
	token, err := utils.ExportCSV(csvData,
		fmt.Sprintf("slowquery_%s_%s_*.csv", beginTime, endTime),
		"slowquery/download")
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.String(http.StatusOK, token)
}

// @Router /slow_query/download [get]
// @Summary Download slow query statements
// @Produce text/csv
// @Param token query string true "download token"
// @Failure 400 {object} resterror.ErrorResponse
// @Failure 401 {object} resterror.ErrorResponse
func (s *Service) downloadHandler(c *gin.Context) {
	token := c.Query("token")
	utils.DownloadByToken(token, "slowquery/download", c)
}

// @Summary Query table columns
// @Description Query slowquery table columns
// @Success 200 {array} string
// @Failure 400 {object} resterror.ErrorResponse
// @Failure 401 {object} resterror.ErrorResponse
// @Security JwtAuth
// @Router /slow_query/table_columns [get]
func (s *Service) queryTableColumns(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	cs, err := s.params.SysSchema.GetTableColumnNames(db, slowQueryTable)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, funk.UniqString(append(cs, getVirtualFields()...)))
}
