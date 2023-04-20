// Copyright 2023 PingCAP, Inc. Licensed under Apache-2.0.

package resourcemanager

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/fx"

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
	return &Service{params: p, FeatureResourceManager: ff.Register("resource_manager", ">= 7.1.0")}
}

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/resource_manager")
	endpoint.Use(
		auth.MWAuthRequired(),
		s.FeatureResourceManager.VersionGuard(),
		utils.MWConnectTiDB(s.params.TiDBClient),
	)
	{
		endpoint.GET("/information", s.GetInformation)
		endpoint.GET("/config", s.GetConfig)
		endpoint.GET("/calibrate/hardware", s.GetCalibrateByHardware)
		endpoint.GET("/calibrate/actual", s.GetCalibrateByActual)
	}
}

type GetConfigResponse struct {
	Enable bool `json:"enable" gorm:"column:tidb_enable_resource_control"`
}

// @Summary Get Resource Control enable config
// @Router /resource-manager/config [get]
// @Security JwtAuth
// @Success 200 {string} enable
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetConfig(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	resp := &GetConfigResponse{}
	err := db.Raw("SELECT @@GLOBAL.tidb_enable_resource_control as tidb_enable_resource_control").Find(resp).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

type ResourceInfoRowDef struct {
	Name      string `json:"name" gorm:"column:NAME"`
	RuPerSec  string `json:"ru_per_sec" gorm:"column:RU_PER_SEC"`
	Priority  string `json:"priority" gorm:"column:PRIORITY"`
	Burstable string `json:"burstable" gorm:"column:BURSTABLE"`
}

// @Summary Get Information of Resource Groups
// @Router /resource-manager/information [get]
// @Security JwtAuth
// @Success 200 {object} []ResourceInfoRowDef
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetInformation(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	var cfg []ResourceInfoRowDef
	err := db.Table("INFORMATION_SCHEMA.RESOURCE_GROUPS").Scan(&cfg).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, cfg)
}

type CalibrateResponse struct {
	EstimatedCapacity int `json:"estimated_capacity" gorm:"column:QUOTA"`
}

// @Summary Get calibrate of Resource Groups by hardware deployment
// @Router /resource-manager/calibrate/hardware [get]
// @Param workload query string true "workload" default("tpcc")
// @Success 200 {object} CalibrateResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetCalibrateByHardware(c *gin.Context) {
	w := c.Query("workload")
	if w == "" {
		rest.Error(c, rest.ErrBadRequest.New("workload cannot be empty"))
		return
	}

	db := utils.GetTiDBConnection(c)
	resp := &CalibrateResponse{}
	err := db.Raw(fmt.Sprintf("calibrate resource workload %s", w)).Scan(resp).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

// @Summary Get calibrate of Resource Groups by actual workload
// @Router /resource-manager/calibrate/actual [get]
// @Param start_time query string true "start_time"
// @Param end_time query string true "end_time"
// @Success 200 {object} CalibrateResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetCalibrateByActual(c *gin.Context) {
	sTime := c.Query("start_time")
	if sTime == "" {
		rest.Error(c, rest.ErrBadRequest.New("start_time cannot be empty"))
		return
	}

	eTime := c.Query("end_time")
	if eTime == "" {
		rest.Error(c, rest.ErrBadRequest.New("end_time cannot be empty"))
		return
	}

	db := utils.GetTiDBConnection(c)
	resp := &CalibrateResponse{}
	err := db.Raw(fmt.Sprintf("calibrate resource start_time '%s' end_time '%s'", sTime, eTime)).Scan(resp).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}
