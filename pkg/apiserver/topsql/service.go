// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package topsql

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

var ErrNS = errorx.NewNamespace("error.api.topsql")

type ServiceParams struct {
	fx.In
	TiDBClient *tidb.Client
	NgmProxy   *utils.NgmProxy
}

type Service struct {
	FeatureTopSQL *featureflag.FeatureFlag

	params ServiceParams
}

func newService(p ServiceParams, ff *featureflag.Registry) *Service {
	return &Service{params: p, FeatureTopSQL: ff.Register("topsql", ">= 5.3.0")}
}

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/topsql")
	endpoint.Use(
		auth.MWAuthRequired(),
		s.FeatureTopSQL.VersionGuard(),
		utils.MWConnectTiDB(s.params.TiDBClient),
	)
	{
		endpoint.GET("/config", s.GetConfig)
		endpoint.POST("/config", s.UpdateConfig)
		endpoint.GET("/instances", s.params.NgmProxy.Route("/topsql/v1/instances"))
		endpoint.GET("/cpu_time", s.params.NgmProxy.Route("/topsql/v1/cpu_time"))
	}
}

type InstanceResponse struct {
	Data []InstanceItem `json:"data"`
}

type InstanceItem struct {
	Instance     string `json:"instance"`
	InstanceType string `json:"instance_type"`
}

// @Summary Get availiable instances
// @Router /topsql/instances [get]
// @Security JwtAuth
// @Success 200 {object} InstanceResponse "ok"
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetInstance(c *gin.Context) {
	// dummy, for generate open api
}

type GetCPUTimeRequest struct {
	Instance string `json:"instance"`
	Start    string `json:"start"`
	End      string `json:"end"`
	Top      string `json:"top"`
	Window   string `json:"window"`
}

type CPUTimeResponse struct {
	Data []CPUTimeItem `json:"data"`
}

type CPUTimeItem struct {
	SQLDigest string     `json:"sql_digest"`
	SQLText   string     `json:"sql_text"`
	Plans     []PlanItem `json:"plans"`
}

type PlanItem struct {
	PlanDigest    string   `json:"plan_digest"`
	PlanText      string   `json:"plan_text"`
	TimestampSecs []uint64 `json:"timestamp_secs"`
	CPUTimeMillis []uint32 `json:"cpu_time_millis"`
}

// @Summary Get cpu time
// @Router /topsql/cpu_time [get]
// @Security JwtAuth
// @Param q query GetCPUTimeRequest true "Query"
// @Success 200 {object} CPUTimeResponse "ok"
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetCPUTime(c *gin.Context) {
	// dummy, for generate open api
}

type EditableConfig struct {
	Enable bool `json:"enable" gorm:"column:tidb_enable_top_sql"`
}

// @Summary Get Top SQL config
// @Router /topsql/config [get]
// @Security JwtAuth
// @Success 200 {object} EditableConfig "ok"
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetConfig(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	cfg := &EditableConfig{}
	err := db.Raw("SELECT @@GLOBAL.tidb_enable_top_sql as tidb_enable_top_sql").Find(cfg).Error
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, cfg)
}

// @Summary Update Top SQL config
// @Router /topsql/config [post]
// @Param request body EditableConfig true "Request body"
// @Security JwtAuth
// @Success 204 {object} string
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) UpdateConfig(c *gin.Context) {
	var cfg EditableConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		_ = c.Error(rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	db := utils.GetTiDBConnection(c)
	err := db.Exec("SET @@GLOBAL.tidb_enable_top_sql = @Enable", &cfg).Error
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.Status(http.StatusNoContent)
}
