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
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/thoas/go-funk"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/utils/version"
)

type ServiceParams struct {
	fx.In
	Config     *config.Config
	LocalStore *dbstore.DB
	TiDBClient *tidb.Client
}

type Service struct {
	params ServiceParams
}

func NewService(p ServiceParams) *Service {
	return &Service{params: p}
}

func RegisterRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/info")
	endpoint.GET("/info", s.infoHandler)
	endpoint.Use(auth.MWAuthRequired())
	endpoint.GET("/whoami", s.whoamiHandler)

	endpoint.Use(utils.MWConnectTiDB(s.params.TiDBClient))
	endpoint.GET("/databases", s.databasesHandler)
	endpoint.GET("/tables", s.tablesHandler)
}

type InfoResponse struct { //nolint:golint
	Version            *version.Info `json:"version"`
	EnableTelemetry    bool          `json:"enable_telemetry"`
	EnableExperimental bool          `json:"enable_experimental"`
}

// @ID infoGet
// @Summary Get information about this TiDB Dashboard
// @Success 200 {object} InfoResponse
// @Router /info/info [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) infoHandler(c *gin.Context) {
	resp := InfoResponse{
		Version:            version.GetInfo(),
		EnableTelemetry:    s.params.Config.EnableTelemetry,
		EnableExperimental: s.params.Config.EnableExperimental,
	}
	c.JSON(http.StatusOK, resp)
}

type WhoAmIResponse struct {
	Username string `json:"username"`
	IsShared bool   `json:"is_shared"`
}

// @ID infoWhoami
// @Summary Get information about current session
// @Success 200 {object} WhoAmIResponse
// @Router /info/whoami [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) whoamiHandler(c *gin.Context) {
	sessionUser := c.MustGet(utils.SessionUserKey).(*utils.SessionUser)
	resp := WhoAmIResponse{
		Username: sessionUser.TiDBUsername,
		IsShared: sessionUser.IsShared,
	}
	c.JSON(http.StatusOK, resp)
}

// @ID infoListDatabases
// @Summary List all databases
// @Success 200 {object} []string
// @Router /info/databases [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) databasesHandler(c *gin.Context) {
	type databaseSchemas struct {
		Databases string `gorm:"column:Databases"`
	}
	var result []databaseSchemas
	db := utils.GetTiDBConnection(c)
	err := db.Raw("SHOW DATABASES").Scan(&result).Error
	if err != nil {
		_ = c.Error(err)
		return
	}
	strs := []string{}
	for _, v := range result {
		strs = append(strs, strings.ToLower(v.Databases))
	}
	sort.Strings(strs)
	c.JSON(http.StatusOK, strs)
}

type tableSchema struct {
	TableName string `gorm:"column:TABLE_NAME" json:"table_name"`
	TableID   string `gorm:"column:TIDB_TABLE_ID" json:"table_id"`
}

// @ID infoListTables
// @Summary List tables by database name
// @Success 200 {object} []tableSchema
// @Router /info/tables [get]
// @Param database_name query string false "Database name"
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) tablesHandler(c *gin.Context) {
	var result []tableSchema
	db := utils.GetTiDBConnection(c)
	tx := db.Select([]string{"TABLE_NAME", "TIDB_TABLE_ID"}).Table("INFORMATION_SCHEMA.TABLES")
	databaseName := c.Query("database_name")

	if databaseName != "" {
		tx = tx.Where("TABLE_SCHEMA = ?", databaseName)
	}

	err := tx.Order("TABLE_NAME").Scan(&result).Error
	if err != nil {
		_ = c.Error(err)
		return
	}

	result = funk.Map(result, func(item tableSchema) tableSchema {
		item.TableName = strings.ToLower(item.TableName)
		return item
	}).([]tableSchema)
	c.JSON(http.StatusOK, result)
}
