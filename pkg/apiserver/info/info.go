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

package info

import (
	"net/http"

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
	endpoint := r.Group("/info")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.GET("/info", s.infoHandler)
	endpoint.GET("/whoami", s.whoamiHandler)
	endpoint.GET("/databases", utils.MWConnectTiDB(s.tidbForwarder), s.databasesHandler)
}

type InfoResponse struct { //nolint:golint
	Version    utils2.VersionInfo `json:"version"`
	PDEndPoint string             `json:"pd_end_point"`
}

// @Summary Dashboard info
// @Description Get information about the dashboard service.
// @ID getInfo
// @Produce json
// @Success 200 {object} InfoResponse
// @Router /info/info [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) infoHandler(c *gin.Context) {
	resp := InfoResponse{
		Version:    utils2.GetVersionInfo(),
		PDEndPoint: s.config.PDEndPoint,
	}
	c.JSON(http.StatusOK, resp)
}

type WhoAmIResponse struct {
	Username string `json:"username"`
}

// @Summary Current login
// @Description Get current login session
// @Produce json
// @Success 200 {object} WhoAmIResponse
// @Router /info/whoami [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) whoamiHandler(c *gin.Context) {
	sessionUser := c.MustGet(utils.SessionUserKey).(*utils.SessionUser)
	resp := WhoAmIResponse{Username: sessionUser.TiDBUsername}
	c.JSON(http.StatusOK, resp)
}

type DatabaseResponse = []string

// @Summary Example: Get all databases
// @Description Get all databases.
// @Produce json
// @Success 200 {object} DatabaseResponse
// @Router /info/databases [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) databasesHandler(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	var result DatabaseResponse
	err := db.Raw("show databases").Pluck("Databases", &result).Error
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, result)
}
