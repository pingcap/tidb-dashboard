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
	endpoint.GET("/overviews", s.overviewsHandler)
	endpoint.GET("/detail", s.detailHandler)
	endpoint.GET("/nodes", s.nodesHandler)
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

// @Summary Statements overview
// @Description Get statements overview
// @Produce json
// @Param schemas query string false "Target schemas"
// @Param begin_time query string true "Statement begin time"
// @Param end_time query string true "Statement end time"
// @Success 200 {array} statement.Overview
// @Router /statements/overviews [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) overviewsHandler(c *gin.Context) {
	var schemas []string
	schemasQuery := c.Query("schemas")
	if schemasQuery != "" {
		schemas = strings.Split(schemasQuery, ",")
	}
	beginTime := c.Query("begin_time")
	endTime := c.Query("end_time")
	if beginTime == "" || endTime == "" {
		_ = c.Error(fmt.Errorf("invalid begin_time or end_time"))
		return
	}
	db := utils.GetTiDBConnection(c)
	overviews, err := QueryStatementsOverview(db, schemas, beginTime, endTime)
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
// @Success 200 {object} statement.Detail
// @Router /statements/detail [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) detailHandler(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	schema := c.Query("schema")
	beginTime := c.Query("begin_time")
	endTime := c.Query("end_time")
	digest := c.Query("digest")
	detail, err := QueryStatementDetail(db, schema, beginTime, endTime, digest)
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
	beginTime := c.Query("begin_time")
	endTime := c.Query("end_time")
	digest := c.Query("digest")
	nodes, err := QueryStatementNodes(db, schema, beginTime, endTime, digest)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, nodes)
}
