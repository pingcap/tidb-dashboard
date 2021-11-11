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

// conprof is short for continuous profiling
package conprof

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"
	"golang.org/x/sync/singleflight"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	apiutils "github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/utils"
	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
)

var (
	ConProfErrNS             = errorx.NewNamespace("error.api.continuous_profiling")
	ErrNgMonitoringNotDeploy = ConProfErrNS.NewType("ng_monitoring_not_deploy")
	ErrNgMonitoringNotStart  = ConProfErrNS.NewType("ng_monitoring_not_start")
)

const (
	ngMonitoringCacheTTL = time.Second * 5
)

type ngMonitoringAddrCacheEntity struct {
	address string
	err     error
	cacheAt time.Time
}

type ServiceParams struct {
	fx.In

	EtcdClient *clientv3.Client
	Config     *config.Config
}

type Service struct {
	params       ServiceParams
	lifecycleCtx context.Context

	ngMonitoringReqGroup  singleflight.Group
	ngMonitoringAddrCache atomic.Value
}

func newService(lc fx.Lifecycle, p ServiceParams) *Service {
	s := &Service{params: p}
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			s.lifecycleCtx = ctx
			return nil
		},
	})
	return s
}

// Register register the handlers to the service.
func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/continuous_profiling")

	endpoint.Use(apiutils.MWForbidByFeatureFlag([]*utils.FeatureFlag{
		FeatureFlagConprof,
	}, s.params.Config.FeatureVersion))
	{
		endpoint.GET("/config", auth.MWAuthRequired(), s.reverseProxy("/config"), s.conprofConfig)
		endpoint.POST("/config", auth.MWAuthRequired(), auth.MWRequireWritePriv(), s.reverseProxy("/config"), s.updateConprofConfig)
		endpoint.GET("/components", auth.MWAuthRequired(), s.reverseProxy("/continuous_profiling/components"), s.conprofComponents)
		endpoint.GET("/estimate_size", auth.MWAuthRequired(), s.reverseProxy("/continuous_profiling/estimate_size"), s.estimateSize)
		endpoint.GET("/group_profiles", auth.MWAuthRequired(), s.reverseProxy("/continuous_profiling/group_profiles"), s.conprofGroupProfiles)
		endpoint.GET("/group_profile/detail", auth.MWAuthRequired(), s.reverseProxy("/continuous_profiling/group_profile/detail"), s.conprofGroupProfileDetail)

		endpoint.GET("/action_token", auth.MWAuthRequired(), s.genConprofActionToken)
		endpoint.GET("/download", s.reverseProxy("/continuous_profiling/download"), s.conprofDownload)
		endpoint.GET("/single_profile/view", s.reverseProxy("/continuous_profiling/single_profile/view"), s.conprofViewProfile)
	}
}

func (s *Service) reverseProxy(targetPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ngMonitoringAddr, err := s.getNgMonitoringAddrFromCache()
		if err != nil {
			_ = c.Error(err)
			return
		}

		c.Request.URL.Path = targetPath
		token := c.Query("token")
		if token != "" {
			queryStr, err := apiutils.ParseJWTString("conprof", token)
			if err != nil {
				apiutils.MakeInvalidRequestErrorFromError(c, err)
				return
			}
			c.Request.URL.RawQuery = queryStr
		}

		ngMonitoringURL, _ := url.Parse(ngMonitoringAddr)
		proxy := httputil.NewSingleHostReverseProxy(ngMonitoringURL)
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}

func (s *Service) getNgMonitoringAddrFromCache() (string, error) {
	fn := func() (string, error) {
		// Check whether cache is valid, and use the cache if possible.
		if v := s.ngMonitoringAddrCache.Load(); v != nil {
			entity := v.(*ngMonitoringAddrCacheEntity)
			if entity.cacheAt.Add(ngMonitoringCacheTTL).After(time.Now()) {
				return entity.address, entity.err
			}
		}

		addr, err := s.resolveNgMonitoringAddress()

		s.ngMonitoringAddrCache.Store(&ngMonitoringAddrCacheEntity{
			address: addr,
			err:     err,
			cacheAt: time.Now(),
		})

		return addr, err
	}

	resolveResult, err, _ := s.ngMonitoringReqGroup.Do("any_key", func() (interface{}, error) {
		return fn()
	})
	return resolveResult.(string), err
}

func (s *Service) resolveNgMonitoringAddress() (string, error) {
	pi, err := topology.FetchPrometheusTopology(s.lifecycleCtx, s.params.EtcdClient)
	if pi == nil || err != nil {
		return "", ErrNgMonitoringNotDeploy.Wrap(err, "NgMonitoring component is not deployed")
	}

	addr, err := topology.FetchNgMonitoringTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err == nil && addr != "" {
		return fmt.Sprintf("http://%s", addr), nil
	}
	return "", ErrNgMonitoringNotStart.Wrap(err, "NgMonitoring component is not started")
}

type ContinuousProfilingConfig struct {
	Enable               bool `json:"enable"`
	ProfileSeconds       int  `json:"profile_seconds"`
	IntervalSeconds      int  `json:"interval_seconds"`
	TimeoutSeconds       int  `json:"timeout_seconds"`
	DataRetentionSeconds int  `json:"data_retention_seconds"`
}

type NgMonitoringConfig struct {
	ContinuousProfiling ContinuousProfilingConfig `json:"continuous_profiling"`
}

// @Summary Get Continuous Profiling Config
// @Success 200 {object} NgMonitoringConfig
// @Router /continuous_profiling/config [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) conprofConfig(c *gin.Context) {
	// dummy, for generate openapi
}

// @Summary Update Continuous Profiling Config
// @Router /continuous_profiling/config [post]
// @Param request body NgMonitoringConfig true "Request body"
// @Security JwtAuth
// @Success 200 {string} string "ok"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) updateConprofConfig(c *gin.Context) {
	// dummy, for generate openapi
}

type Component struct {
	Name       string `json:"name"`
	IP         string `json:"ip"`
	Port       uint   `json:"port"`
	StatusPort uint   `json:"status_port"`
}

// @Summary Get current scraping components
// @Success 200 {array} Component
// @Router /continuous_profiling/components [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) conprofComponents(c *gin.Context) {
	// dummy, for generate openapi
}

type EstimateSizeRes struct {
	InstanceCount int `json:"instance_count"`
	ProfileSize   int `json:"profile_size"`
}

// @Summary Get Estimate Size
// @Router /continuous_profiling/estimate_size [get]
// @Security JwtAuth
// @Success 200 {object} EstimateSizeRes
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) estimateSize(c *gin.Context) {
	// dummy, for generate openapi
}

type GetGroupProfileReq struct {
	BeginTime int `json:"begin_time"`
	EndTime   int `json:"end_time"`
}

type ComponentNum struct {
	TiDB    int `json:"tidb"`
	PD      int `json:"pd"`
	TiKV    int `json:"tikv"`
	TiFlash int `json:"tiflash"`
}

type GroupProfiles struct {
	Ts          int64        `json:"ts"`
	ProfileSecs int          `json:"profile_duration_secs"`
	State       string       `json:"state"`
	CompNum     ComponentNum `json:"component_num"`
}

type GroupProfileDetail struct {
	Ts             int64           `json:"ts"`
	ProfileSecs    int             `json:"profile_duration_secs"`
	State          string          `json:"state"`
	TargetProfiles []ProfileDetail `json:"target_profiles"`
}

type ProfileDetail struct {
	State  string `json:"state"`
	Error  string `json:"error"`
	Type   string `json:"profile_type"`
	Target Target `json:"target"`
}

type Target struct {
	Component string `json:"component"`
	Address   string `json:"address"`
}

// @Summary Get Group Profiles
// @Router /continuous_profiling/group_profiles [get]
// @Param q query GetGroupProfileReq true "Query"
// @Security JwtAuth
// @Success 200 {array} GroupProfiles
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) conprofGroupProfiles(c *gin.Context) {
	// dummy, for generate openapi
}

// @Summary Get Group Profile Detail
// @Router /continuous_profiling/group_profile/detail [get]
// @Param ts query number true "timestamp"
// @Security JwtAuth
// @Success 200 {object} GroupProfileDetail
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) conprofGroupProfileDetail(c *gin.Context) {
	// dummy, for generate openapi
}

// @Summary Get action token for download or view profile
// @Router /continuous_profiling/action_token [get]
// @Param q query string true "target query string"
// @Security JwtAuth
// @Success 200 {string} string
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) genConprofActionToken(c *gin.Context) {
	q := c.Query("q")
	token, err := apiutils.NewJWTString("conprof", q)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.String(http.StatusOK, token)
}

// @Summary Download Group Profile files
// @Router /continuous_profiling/download [get]
// @Param ts query number true "timestamp"
// @Security JwtAuth
// @Produce application/x-gzip
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) conprofDownload(c *gin.Context) {
	// dummy, for generate openapi
}

type ViewSingleProfileReq struct {
	Ts          int    `json:"ts"`
	ProfileType string `json:"profile_type"`
	Component   string `json:"component"`
	Address     string `json:"address"`
}

// @Summary View Single Profile files
// @Router /continuous_profiling/single_profile/view [get]
// @Param q query ViewSingleProfileReq true "Query"
// @Security JwtAuth
// @Produce html
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) conprofViewProfile(c *gin.Context) {
	// dummy, for generate openapi
}
