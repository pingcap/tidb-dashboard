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
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb"
)

type Service struct {
	config        *config.Config
	tidbForwarder *tidb.Forwarder
}

func NewService(config *config.Config, tidbForwarder *tidb.Forwarder) *Service {
	return &Service{config: config, tidbForwarder: tidbForwarder}
}

func Register(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/statements")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.Use(utils.MWConnectTiDB(s.tidbForwarder))
	endpoint.GET("/schemas", s.schemasHandler)
	endpoint.GET("/time_ranges", s.timeRangesHandler)
	endpoint.GET("/stmt_types", s.stmtTypesHandler)
	endpoint.GET("/overviews", s.overviewsHandler)
	endpoint.GET("/detail", s.detailHandler)
	endpoint.GET("/nodes", s.nodesHandler)
	endpoint.GET("/plans", s.getPlansHandler)
}

// @Summary TiDB databases
// @Description Get all databases of TiDB
// @Produce json
// @Success 200 {array} string
// @Router /statements/schemas [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) schemasHandler(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	schemas, err := QuerySchemas(db)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, schemas)
}

// @Summary Statement time ranges
// @Description Get all time ranges of the statements
// @Produce json
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

// @Summary Statement types
// @Description Get all statement types
// @Produce json
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

// @Summary Statements overview
// @Description Get statements overview
// @Produce json
// @Param begin_time query string true "Statement begin time"
// @Param end_time query string true "Statement end time"
// @Param schemas query string false "Target schemas"
// @Param stmt_types query string false "Target statement types"
// @Success 200 {array} statement.Overview
// @Router /statements/overviews [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) overviewsHandler(c *gin.Context) {
	beginTime, endTime, err := parseTimeParams(c)
	if err != nil {
		_ = c.Error(err)
		return
	}
	schemas := strings.Split(c.Query("schemas"), ",")
	if len(schemas) == 1 && schemas[0] == "" {
		schemas = nil
	}
	stmtTypes := strings.Split(c.Query("stmt_types"), ",")
	if len(stmtTypes) == 1 && stmtTypes[0] == "" {
		stmtTypes = nil
	}

	db := utils.GetTiDBConnection(c)
	overviews, err := QueryStatementsOverview(db, beginTime, endTime, schemas, stmtTypes)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, overviews)
}

// @Summary Statement detail
// @Description Get statement detail
// @Produce json
// @Param schema query string true "Statement schema"
// @Param begin_time query string true "Statement begin time"
// @Param end_time query string true "Statement end time"
// @Param digest query string true "Statement digest"
// @Success 200 {object} Detail
// @Router /statements/detail [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) detailHandler(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	schema := c.Query("schema")
	digest := c.Query("digest")
	beginTime, endTime, err := parseTimeParams(c)
	if err != nil {
		_ = c.Error(err)
		return
	}

	detail, err := QueryStatementDetail(db, schema, digest, beginTime, endTime)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, detail)
}

// @Summary Statement nodes
// @Description Get statement in each node
// @Produce json
// @Param schema query string true "Statement schema"
// @Param begin_time query string true "Statement begin time"
// @Param end_time query string true "Statement end time"
// @Param digest query string true "Statement digest"
// @Success 200 {array} statement.Node
// @Router /statements/nodes [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) nodesHandler(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	schema := c.Query("schema")
	digest := c.Query("digest")
	beginTime, endTime, err := parseTimeParams(c)
	if err != nil {
		_ = c.Error(err)
		return
	}

	nodes, err := QueryStatementNodes(db, schema, digest, beginTime, endTime)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, nodes)
}

type GetPlansRequest struct {
	SchemaName string `json:"schema_name" form:"schema_name"`
	Digest     string `json:"digest" form:"digest"`
	BeginTime  int    `json:"begin_time" form:"begin_time"`
	EndTime    int    `json:"end_time" form:"end_time"`
}

// @Summary Get statement plans
// @Description Get statement plans
// @Produce json
// @Param q query GetPlansRequest true "Query"
// @Success 200 {array} PlanDetailModel
// @Router /statements/plans [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) getPlansHandler(c *gin.Context) {
	var req GetPlansRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(utils.ErrInvalidRequest.WrapWithNoMessage(err))
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

func parseTimeParams(c *gin.Context) (int64, int64, error) {
	beginTime, err := strconv.Atoi(c.Query("begin_time"))
	if err != nil {
		return 0, 0, fmt.Errorf("invalid begin_time: %s", err)
	}
	endTime, err := strconv.Atoi(c.Query("end_time"))
	if err != nil {
		return 0, 0, fmt.Errorf("invalid end_time: %s", err)
	}
	return int64(beginTime), int64(endTime), nil
}
