// Copyright 2023 PingCAP, Inc. Licensed under Apache-2.0.

package resource_manager

import (
	"github.com/gin-gonic/gin"
	"go.uber.org/fx"
	"net/http"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

type ServiceParams struct {
	fx.In
	TiDBClient *tidb.Client
}

type Service struct {
	FeatureResourceManager *featureflag.FeatureFlag

	params ServiceParams
}

func newService(p ServiceParams, ff *featureflag.Registry) *Service {
	return &Service{params: p, FeatureResourceManager: ff.Register("resource_manager", ">= 7.0.0")}
}

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/resource-manager")
	endpoint.Use(
		auth.MWAuthRequired(),
		s.FeatureResourceManager.VersionGuard(),
		utils.MWConnectTiDB(s.params.TiDBClient),
	)
	{
		endpoint.GET("/information", s.GetInformation)
		endpoint.GET("/config", s.GetConfig)
		endpoint.GET("/calibrate", s.GetCalibrate)
	}
}

// @Summary Get Resource Control enable config
// @Router /resource-manager/config [get]
// @Security JwtAuth
// @Success 200 {string} enable
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetConfig(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	var enable string
	err := db.Raw("SELECT @@GLOBAL.tidb_enable_resource_control as tidb_enable_resource_control").Find(&enable).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, enable)
}

type TableRowDef struct {
	name      string `json:"name" gorm:"column:NAME"`
	ruPerSec  string `json:"ru_per_sec" gorm:"column:RU_PER_SEC"`
	priority  string `json:"priority" gorm:"column:PRIORITY"`
	burstable string `json:"burstable" gorm:"column:BURSTABLE"`
}

// @Summary Get Information of Resource Groups
// @Router /resource-manager/information [get]
// @Security JwtAuth
// @Success 200 {object} TableRowDef
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetInformation(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	cfg := &TableRowDef{}
	err := db.Table("INFORMATION_SCHEMA.RESOURCE_GROUPS").Take(cfg).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, cfg)
}

// @Summary Get calibrate of Resource Groups by workload
// @Router /resource-manager/calibrate [get]
// @Param workload string "workload"
// @Security JwtAuth
// @Success 200 {string} resourceNums
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetCalibrate(c *gin.Context) {
	w := c.Param("workload")
	db := utils.GetTiDBConnection(c)
	if w != "" {
		w = "tpcc"
	}

	var resourceNums string
	err := db.Raw("calibrate resource workload (?)", w).Find(resourceNums).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, resourceNums)
}
