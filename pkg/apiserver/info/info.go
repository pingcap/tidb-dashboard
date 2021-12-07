// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

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
	"github.com/pingcap/tidb-dashboard/util/featureflag"
)

type ServiceParams struct {
	fx.In
	Config              *config.Config
	LocalStore          *dbstore.DB
	TiDBClient          *tidb.Client
	FeatureFlagRegistry *featureflag.Registry
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

type InfoResponse struct { //nolint
	Version            *version.Info `json:"version"`
	EnableTelemetry    bool          `json:"enable_telemetry"`
	EnableExperimental bool          `json:"enable_experimental"`
	SupportedFeatures  []string      `json:"supported_features"`
}

// @ID infoGet
// @Summary Get information about this TiDB Dashboard
// @Success 200 {object} InfoResponse
// @Router /info/info [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) infoHandler(c *gin.Context) {
	resp := InfoResponse{
		Version:            version.GetInfo(),
		EnableTelemetry:    s.params.Config.EnableTelemetry,
		EnableExperimental: s.params.Config.EnableExperimental,
		SupportedFeatures:  s.params.FeatureFlagRegistry.SupportedFeatures(),
	}
	c.JSON(http.StatusOK, resp)
}

type WhoAmIResponse struct {
	DisplayName string `json:"display_name"`
	IsShareable bool   `json:"is_shareable"`
	IsWriteable bool   `json:"is_writeable"`
}

// @ID infoWhoami
// @Summary Get information about current session
// @Success 200 {object} WhoAmIResponse
// @Router /info/whoami [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) whoamiHandler(c *gin.Context) {
	sessionUser := utils.GetSession(c)
	resp := WhoAmIResponse{
		DisplayName: sessionUser.DisplayName,
		IsShareable: sessionUser.IsShareable,
		IsWriteable: sessionUser.IsWriteable,
	}
	c.JSON(http.StatusOK, resp)
}

// @ID infoListDatabases
// @Summary List all databases
// @Success 200 {object} []string
// @Router /info/databases [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) databasesHandler(c *gin.Context) {
	type databaseSchemas struct {
		Databases string `gorm:"column:Database"`
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
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) tablesHandler(c *gin.Context) {
	var result []tableSchema
	db := utils.GetTiDBConnection(c)
	tx := db.Select([]string{"TABLE_NAME", "TIDB_TABLE_ID"}).Table("INFORMATION_SCHEMA.TABLES")
	databaseName := c.Query("database_name")

	if databaseName != "" {
		tx = tx.Where("LOWER(TABLE_SCHEMA) = ?", strings.ToLower(databaseName))
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
