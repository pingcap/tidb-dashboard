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
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb"
)

type Service struct {
	config        *config.Config
	db            *dbstore.DB
	tidbForwarder *tidb.Forwarder
}

func NewService(config *config.Config, tidbForwarder *tidb.Forwarder, db *dbstore.DB) *Service {
	return &Service{config: config, db: db, tidbForwarder: tidbForwarder}
}

func Register(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/slow_query")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.Use(utils.MWConnectTiDB(s.tidbForwarder))
	endpoint.GET("/list", s.listHandler)
	endpoint.GET("/detail", s.detailhandler)
}

// @Summary Example: Get all databases
// @Description Get all databases.
// @Produce json
// @Param q query QueryRequestParam true "Query"
// @Success 200 {array} Base
// @Router /slow_query/list [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) listHandler(c *gin.Context) {
	var req QueryRequestParam
	if err := c.ShouldBindQuery(&req); err != nil {
		_ = c.Error(err)
		return
	}

	if req.LogStartTS == 0 {
		now := time.Now().Unix()
		before := time.Now().Add(-30 * time.Minute).Unix()
		req.LogStartTS = before
		req.LogEndTS = now
	}

	db := utils.GetTiDBConnection(c)
	results, err := QuerySlowLogList(db, &req)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, results)
}

type DetailRequest struct {
	Digest    string  `json:"digest" form:"digest"`
	Time      float64 `json:"time" form:"time"`
	ConnectID int64   `json:"connect_id" form:"connect_id"`
}

// @Summary Example: Get all databases
// @Description Get all databases.
// @Produce json
// @Param q query DetailRequest true "Query"
// @Success 200 {object} SlowQuery
// @Router /slow_query/detail [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) detailhandler(c *gin.Context) {
	var req DetailRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(utils.ErrInvalidRequest.WrapWithNoMessage(err))
		return
	}

	db := utils.GetTiDBConnection(c)
	result, err := QuerySlowLogDetail(db, &req)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, *result)
}
