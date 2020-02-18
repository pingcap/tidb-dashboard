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
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

type Service struct {
	config *config.Config
	db     *sql.DB
}

func NewService(config *config.Config) *Service {
	db := OpenTiDB(config)
	return &Service{config: config, db: db}
}

func (s *Service) Register(r *gin.RouterGroup) {
	endpoint := r.Group("/statements")
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
func (s *Service) schemasHandler(c *gin.Context) {
	schemas, err := QuerySchemas(s.db)
	if err != nil {
		handleError(c, err)
	} else {
		c.JSON(http.StatusOK, schemas)
	}
}

// @Summary Statement time ranges
// @Description Get all time ranges of the statements
// @Produce json
// @Success 200 {array} statement.TimeRange
// @Router /statements/time_ranges [get]
func (s *Service) timeRangesHandler(c *gin.Context) {
	timeRanges, err := QueryTimeRanges(s.db)
	if err != nil {
		handleError(c, err)
	} else {
		c.JSON(http.StatusOK, timeRanges)
	}
}

// @Summary Statements overview
// @Description Get statements overview
// @Produce json
// @Param schemas query string false "Target schemas"
// @Param begin_time query string true "Statement begin time"
// @Param end_time query string true "Statement end time"
// @Success 200 {array} statement.Overview
// @Router /statements/overviews [get]
func (s *Service) overviewsHandler(c *gin.Context) {
	schemas := []string{}
	schemasQuery := c.Query("schemas")
	if schemasQuery != "" {
		schemas = strings.Split(schemasQuery, ",")
	}
	beginTime := c.Query("begin_time")
	endTime := c.Query("end_time")
	if beginTime == "" || endTime == "" {
		handleError(c, errors.New("invalid begin_time or end_time"))
		return
	}
	overviews, err := QueryStatementsOverview(s.db, schemas, beginTime, endTime)
	if err != nil {
		handleError(c, err)
	} else {
		c.JSON(http.StatusOK, overviews)
	}
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
func (s *Service) detailHandler(c *gin.Context) {
	schema := c.Query("schema")
	beginTime := c.Query("begin_time")
	endTime := c.Query("end_time")
	digest := c.Query("digest")
	detail, err := QueryStatementDetail(s.db, schema, beginTime, endTime, digest)
	if err != nil {
		handleError(c, err)
	} else {
		c.JSON(http.StatusOK, detail)
	}
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
func (s *Service) nodesHandler(c *gin.Context) {
	schema := c.Query("schema")
	beginTime := c.Query("begin_time")
	endTime := c.Query("end_time")
	digest := c.Query("digest")
	nodes, err := QueryStatementNodes(s.db, schema, beginTime, endTime, digest)
	if err != nil {
		handleError(c, err)
	} else {
		c.JSON(http.StatusOK, nodes)
	}
}

func handleError(c *gin.Context, err error) {
	c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
}
