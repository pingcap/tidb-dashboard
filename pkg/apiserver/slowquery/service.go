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
	"time"

	"github.com/gin-gonic/gin"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb"
	utils2 "github.com/pingcap-incubator/tidb-dashboard/pkg/utils"
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
	endpoint := r.Group("/slowquery")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.Use(utils.MWConnectTiDB(s.tidbForwarder))
	endpoint.GET("/list", s.listHandler)
	endpoint.GET("/detail", s.detailhandler)
}

type InfoResponse struct { //nolint:golint
	Version    utils2.VersionInfo `json:"version"`
	PDEndPoint string             `json:"pd_end_point"`
}

type DatabaseResponse = []string

// @Summary Example: Get all databases
// @Description Get all databases.
// @Produce json
// @Param q query QueryRequestParam true "Query"
// @Success 200 {array} Base
// @Router /slowquery/list [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) listHandler(c *gin.Context) {
	var req QueryRequestParam
	if err := c.ShouldBindQuery(&req); err != nil {
		_ = c.Error(err)
		return
	}
	fmt.Printf("req: %+v\n", req)

	if req.LogStartTS == 0 {
		now := time.Now().Unix()
		before := time.Now().AddDate(0, 0, -1).Unix()
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
	Digest    string  `json:"digest"`
	Time      float64 `json:"time"`
	ConnectID int64   `json:"connect_id"`
}

// @Summary Example: Get all databases
// @Description Get all databases.
// @Produce json
// @Param q query DetailRequest true "Query"
// @Success 200 {object} SlowQuery
// @Router /slowquery/detail [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) detailhandler(c *gin.Context) {
	db := utils.GetTiDBConnection(c)

	req := DetailRequest{
		Digest:    "db2dfbe10c95c4f44524bfafd669fe532077655ce85fa5fc6927c48999769e29",
		Time:      1587467607.4329019,
		ConnectID: 38,
	}
	//if err := c.ShouldBindJSON(&req); err != nil {
	//	c.Status(http.StatusBadRequest)
	//	_ = c.Error(utils.ErrInvalidRequest.WrapWithNoMessage(err))
	//	return
	//}
	db.LogMode(true)
	result, err := QuerySlowLogDetail(db, &req)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, *result)
}
