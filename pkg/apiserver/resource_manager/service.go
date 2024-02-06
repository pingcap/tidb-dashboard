// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package resourcemanager

import (
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

var workloadInjectChecker = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)

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
		endpoint.GET("/config", s.GetConfig)
		endpoint.GET("/information", s.GetInformation)
		endpoint.GET("/information/group_names", s.resourceGroupNamesHandler)
		endpoint.GET("/calibrate/hardware", s.GetCalibrateByHardware)
		endpoint.GET("/calibrate/actual", s.GetCalibrateByActual)
	}
}

type GetConfigResponse struct {
	Enable bool `json:"enable" gorm:"column:tidb_enable_resource_control"`
}

// @Summary Get Resource Control enable config
// @Router /resource_manager/config [get]
// @Security JwtAuth
// @Success 200 {object} GetConfigResponse
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
// @Router /resource_manager/information [get]
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

// @Summary List all resource groups
// @Router /resource_manager/information/group_names [get]
// @Security JwtAuth
// @Success 200 {object} []string
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) resourceGroupNamesHandler(c *gin.Context) {
	type groupSchemas struct {
		Groups string `gorm:"column:NAME"`
	}
	var result []groupSchemas
	db := utils.GetTiDBConnection(c)
	err := db.Raw("SELECT NAME FROM INFORMATION_SCHEMA.RESOURCE_GROUPS").Scan(&result).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	strs := []string{}
	for _, v := range result {
		strs = append(strs, strings.ToLower(v.Groups))
	}
	sort.Strings(strs)
	c.JSON(http.StatusOK, strs)
}

type CalibrateResponse struct {
	EstimatedCapacity int `json:"estimated_capacity" gorm:"column:QUOTA"`
}

// @Summary Get calibrate of Resource Groups by hardware deployment
// @Router /resource_manager/calibrate/hardware [get]
// @Param workload query string true "workload" default("tpcc")
// @Security JwtAuth
// @Success 200 {object} CalibrateResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetCalibrateByHardware(c *gin.Context) {
	w := c.Query("workload")
	if w == "" {
		rest.Error(c, rest.ErrBadRequest.New("workload cannot be empty"))
		return
	}
	if !workloadInjectChecker.MatchString(w) {
		rest.Error(c, errors.New("invalid workload"))
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

type GetCalibrateByActualRequest struct {
	StartTime int64 `json:"start_time" form:"start_time"`
	EndTime   int64 `json:"end_time" form:"end_time"`
}

// @Summary Get calibrate of Resource Groups by actual workload
// @Router /resource_manager/calibrate/actual [get]
// @Param q query GetCalibrateByActualRequest true "Query"
// @Security JwtAuth
// @Success 200 {object} CalibrateResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetCalibrateByActual(c *gin.Context) {
	var req GetCalibrateByActualRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	startTime := time.Unix(req.StartTime, 0).Format("2006-01-02 15:04:05")
	endTime := time.Unix(req.EndTime, 0).Format("2006-01-02 15:04:05")

	db := utils.GetTiDBConnection(c)
	resp := &CalibrateResponse{}
	err := db.Raw(fmt.Sprintf("calibrate resource start_time '%s' end_time '%s'", startTime, endTime)).Scan(resp).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}
