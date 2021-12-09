// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package topsql

import (
	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
)

var ErrNS = errorx.NewNamespace("error.api.top_sql")

type Service struct {
	FeatureTopSQL *featureflag.FeatureFlag

	ngmProxy *utils.NgmProxy
}

func newService(ngmProxy *utils.NgmProxy, ff *featureflag.Registry) *Service {
	return &Service{ngmProxy: ngmProxy, FeatureTopSQL: ff.Register("topsql", ">= 5.3.0")}
}

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/top_sql")
	endpoint.Use(auth.MWAuthRequired(), s.FeatureTopSQL.VersionGuard())
	{
		endpoint.GET("/instances", s.ngmProxy.Route("/topsql/v1/instances"))
		endpoint.GET("/cpu_time", s.ngmProxy.Route("/topsql/v1/cpu_time"))
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
// @Router /top_sql/instances [get]
// @Security JwtAuth
// @Success 200 {object} InstanceResponse "ok"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
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
// @Router /top_sql/cpu_time [get]
// @Security JwtAuth
// @Param q query GetCPUTimeRequest true "Query"
// @Success 200 {object} CPUTimeResponse "ok"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) GetCPUTime(c *gin.Context) {
	// dummy, for generate open api
}
