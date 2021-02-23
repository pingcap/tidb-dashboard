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

package statement

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/joomcode/errorx"

	"github.com/gin-gonic/gin"

	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
)

var (
	ErrNS     = errorx.NewNamespace("error.api.statement")
	ErrNoData = ErrNS.NewType("export_no_data")
)

type ServiceParams struct {
	fx.In
	TiDBClient *tidb.Client
}

type Service struct {
	params ServiceParams
}

func NewService(p ServiceParams) *Service {
	return &Service{params: p}
}

func RegisterRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/statements")
	{
		endpoint.GET("/download", s.downloadHandler)

		endpoint.Use(auth.MWAuthRequired())
		endpoint.Use(utils.MWConnectTiDB(s.params.TiDBClient))
		{
			endpoint.GET("/config", s.configHandler)
			endpoint.POST("/config", s.modifyConfigHandler)
			endpoint.GET("/time_ranges", s.timeRangesHandler)
			endpoint.GET("/stmt_types", s.stmtTypesHandler)
			endpoint.GET("/list", s.listHandler)
			endpoint.GET("/plans", s.plansHandler)
			endpoint.GET("/plan/detail", s.planDetailHandler)

			endpoint.POST("/download/token", s.downloadTokenHandler)
		}
	}
}

// @Summary Get statement configurations
// @Success 200 {object} statement.Config
// @Router /statements/config [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) configHandler(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	cfg, err := QueryStmtConfig(db)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, cfg)
}

// @Summary Update statement configurations
// @Param request body statement.Config true "Request body"
// @Success 204 {object} string
// @Router /statements/config [post]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) modifyConfigHandler(c *gin.Context) {
	var req Config
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}
	db := utils.GetTiDBConnection(c)
	err := UpdateStmtConfig(db, &req)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.Status(http.StatusNoContent)
}

// @Summary Get available statement time ranges
// @Success 200 {array} statement.TimeRange
// @Router /statements/time_ranges [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) timeRangesHandler(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	timeRanges, err := QueryTimeRanges(db)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, timeRanges)
}

// @Summary Get all statement types
// @Success 200 {array} string
// @Router /statements/stmt_types [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) stmtTypesHandler(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	stmtTypes, err := QueryStmtTypes(db)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, stmtTypes)
}

type GetStatementsRequest struct {
	Schemas   []string `json:"schemas" form:"schemas"`
	StmtTypes []string `json:"stmt_types" form:"stmt_types"`
	BeginTime int      `json:"begin_time" form:"begin_time"`
	EndTime   int      `json:"end_time" form:"end_time"`
	Text      string   `json:"text" form:"text"`
	Fields    string   `json:"fields" form:"fields"`
}

// @Summary Get a list of statements
// @Param q query GetStatementsRequest true "Query"
// @Success 200 {array} Model
// @Router /statements/list [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) listHandler(c *gin.Context) {
	var req GetStatementsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}
	db := utils.GetTiDBConnection(c)
	fields := []string{}
	if strings.TrimSpace(req.Fields) != "" {
		fields = strings.Split(req.Fields, ",")
	}
	overviews, err := QueryStatements(
		db,
		req.BeginTime, req.EndTime,
		req.Schemas,
		req.StmtTypes,
		req.Text,
		fields)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, overviews)
}

type GetPlansRequest struct {
	SchemaName string `json:"schema_name" form:"schema_name"`
	Digest     string `json:"digest" form:"digest"`
	BeginTime  int    `json:"begin_time" form:"begin_time"`
	EndTime    int    `json:"end_time" form:"end_time"`
}

// @Summary Get execution plans of a statement
// @Param q query GetPlansRequest true "Query"
// @Success 200 {array} Model
// @Router /statements/plans [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) plansHandler(c *gin.Context) {
	var req GetPlansRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}
	db := utils.GetTiDBConnection(c)
	plans, err := QueryPlans(db, req.BeginTime, req.EndTime, req.SchemaName, req.Digest)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, plans)
}

type GetPlanDetailRequest struct {
	GetPlansRequest
	Plans []string `json:"plans" form:"plans"`
}

// @Summary Get details of a statement in an execution plan
// @Param q query GetPlanDetailRequest true "Query"
// @Success 200 {object} Model
// @Router /statements/plan/detail [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) planDetailHandler(c *gin.Context) {
	var req GetPlanDetailRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}
	db := utils.GetTiDBConnection(c)
	result, err := QueryPlanDetail(db, req.BeginTime, req.EndTime, req.SchemaName, req.Digest, req.Plans)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// @Router /statements/download/token [post]
// @Summary Generate a download token for exported statements
// @Produce plain
// @Param request body GetStatementsRequest true "Request body"
// @Success 200 {string} string "xxx"
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) downloadTokenHandler(c *gin.Context) {
	var req GetStatementsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}
	db := utils.GetTiDBConnection(c)
	fields := []string{}
	if strings.TrimSpace(req.Fields) != "" {
		fields = strings.Split(req.Fields, ",")
	}
	overviews, err := QueryStatements(
		db,
		req.BeginTime, req.EndTime,
		req.Schemas,
		req.StmtTypes,
		req.Text,
		fields)
	if err != nil {
		_ = c.Error(err)
		return
	}
	if len(overviews) == 0 {
		_ = c.Error(ErrNoData.NewWithNoMessage())
		return
	}

	// interface{} tricky
	rawData := make([]interface{}, len(overviews))
	for i, v := range overviews {
		rawData[i] = v
	}

	// convert data
	csvData := utils.GenerateCSVFromRaw(rawData, fields, []string{"first_seen", "last_seen"})

	// generate temp file that persist encrypted data
	timeLayout := "01021504"
	beginTime := time.Unix(int64(req.BeginTime), 0).Format(timeLayout)
	endTime := time.Unix(int64(req.EndTime), 0).Format(timeLayout)
	token, err := utils.ExportCSV(csvData,
		fmt.Sprintf("statements_%s_%s_*.csv", beginTime, endTime),
		"statements/download")

	if err != nil {
		_ = c.Error(err)
		return
	}
	c.String(http.StatusOK, token)
}

// @Router /statements/download [get]
// @Summary Download statements
// @Produce text/csv
// @Param token query string true "download token"
// @Failure 400 {object} utils.APIError
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) downloadHandler(c *gin.Context) {
	token := c.Query("token")
	utils.DownloadByToken(token, "statements/download", c)
}
