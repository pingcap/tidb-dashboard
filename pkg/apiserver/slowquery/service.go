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

	"github.com/gin-gonic/gin"
	"go.uber.org/fx"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb"
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

func Register(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/slow_query")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.Use(utils.MWConnectTiDB(s.params.TiDBClient))
	endpoint.GET("/list", s.listHandler)
	endpoint.GET("/detail", s.detailhandler)
}

// @Summary List all slow queries
// @Param q query GetListRequest true "Query"
// @Success 200 {array} Base
// @Router /slow_query/list [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) listHandler(c *gin.Context) {
	var req GetListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}

	db := utils.GetTiDBConnection(c)
	results, err := QuerySlowLogList(db, &req)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, results)
}

// @Summary Get details of a slow query
// @Param q query GetDetailRequest true "Query"
// @Success 200 {object} SlowQuery
// @Router /slow_query/detail [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) detailhandler(c *gin.Context) {
	var req GetDetailRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
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
