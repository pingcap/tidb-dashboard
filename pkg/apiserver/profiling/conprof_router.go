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

package profiling

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
)

const (
	NgMonitoringNotDeploy = "ng_monitoring_not_deploy"
	NgMonitoringNotStart  = "ng_monitoring_not_start"
	NgMonitoringNotAlive  = "ng_monitoring_not_alive"
)

var (
	ConProfErrNS             = errorx.NewNamespace("error.api.continuous_profiling")
	ErrLoadNgMonitoringAddr  = ConProfErrNS.NewType("ng_monitoring_addr_load_failed")
	ErrNgMonitoringNotDeploy = ConProfErrNS.NewType(NgMonitoringNotDeploy)
	ErrNgMonitoringNotStart  = ConProfErrNS.NewType(NgMonitoringNotStart)
	ErrNgMonitoringNotAlive  = ConProfErrNS.NewType(NgMonitoringNotAlive)
)

const (
	ngMonitoringCacheTTL = time.Second * 5
)

type ngMonitoringAddrCacheEntity struct {
	address string
	cacheAt time.Time
}

// Register register the handlers to the service.
func RegisterConprofRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	conprofEndpoint := r.Group("/continuous-profiling")

	conprofEndpoint.GET("/config", auth.MWAuthRequired(), s.reverseProxy("/config"), s.conprofConfig)
	conprofEndpoint.POST("/config", auth.MWAuthRequired(), auth.MWRequireWritePriv(), s.reverseProxy("/config"), s.updateConprofConfig)
	conprofEndpoint.GET("/components", auth.MWAuthRequired(), s.reverseProxy("/continuous-profiling/components"), s.conprofComponents)
	conprofEndpoint.GET("/estimate-size", auth.MWAuthRequired(), s.reverseProxy("/continuous-profiling/estimate-size"), s.estimateSize)
	conprofEndpoint.GET("/group-profiles", auth.MWAuthRequired(), s.reverseProxy("/continuous-profiling/group-profiles"), s.conprofGroupProfiles)
	conprofEndpoint.GET("/group-profile/detail", auth.MWAuthRequired(), s.reverseProxy("/continuous-profiling/group-profile/detail"), s.conprofGroupProfileDetail)

	conprofEndpoint.GET("/action-token", auth.MWAuthRequired(), s.genConprofActionToken)
	conprofEndpoint.GET("/download", s.reverseProxy("/continuous-profiling/download"), s.conprofDownload)
	conprofEndpoint.GET("/single-profile/view", s.reverseProxy("/continuous-profiling/single-profile/view"), s.conprofViewProfile)
}

func (s *Service) reverseProxy(targetPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ngMonitoringAddr, err := s.getNgMonitoringAddrFromCache()
		if err != nil {
			_ = c.Error(ErrLoadNgMonitoringAddr.Wrap(err, "Load NgMonitoring address failed"))
			return
		}
		if ngMonitoringAddr == NgMonitoringNotDeploy {
			_ = c.Error(ErrNgMonitoringNotDeploy.New("NgMonitoring component is not deployed"))
			return
		}
		if ngMonitoringAddr == NgMonitoringNotStart {
			_ = c.Error(ErrNgMonitoringNotStart.New("NgMonitoring component is not started"))
			return
		}
		if ngMonitoringAddr == NgMonitoringNotAlive {
			_ = c.Error(ErrNgMonitoringNotAlive.New("NgMonitoring instance is not alive anymore, it may down or the server time is not synchronized"))
			return
		}

		c.Request.URL.Path = targetPath
		token := c.Query("token")
		if token != "" {
			queryStr, err := utils.ParseJWTString("conprof", token)
			if err != nil {
				utils.MakeInvalidRequestErrorFromError(c, err)
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
				return entity.address, nil
			}
		}

		addr := s.resolveNgMonitoringAddress()

		s.ngMonitoringAddrCache.Store(&ngMonitoringAddrCacheEntity{
			address: addr,
			cacheAt: time.Now(),
		})

		return addr, nil
	}

	resolveResult, err, _ := s.ngMonitoringReqGroup.Do("any_key", func() (interface{}, error) {
		return fn()
	})
	if err != nil {
		return "", err
	}
	return resolveResult.(string), nil
}

func (s *Service) resolveNgMonitoringAddress() string {
	pi, err := topology.FetchPrometheusTopology(s.lifecycleCtx, s.params.EtcdClient)
	if pi == nil || err != nil {
		return NgMonitoringNotDeploy
	}

	addr, err := topology.FetchNgMonitoringTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err == nil && addr != "" {
		return fmt.Sprintf("http://%s", addr)
	}
	if err != nil && errorx.IsOfType(err, topology.ErrInstanceNotAlive) {
		return NgMonitoringNotAlive
	}
	return NgMonitoringNotStart
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
// @Router /continuous-profiling/config [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) conprofConfig(c *gin.Context) {
	// dummy, for generate openapi
}

// @Summary Update Continuous Profiling Config
// @Router /continuous-profiling/config [post]
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
// @Router /continuous-profiling/components [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) conprofComponents(c *gin.Context) {
	// dummy, for generate openapi
}

// @Summary Get Estimate Size
// @Router /continuous-profiling/estimate-size [get]
// @Param days query number true "days"
// @Security JwtAuth
// @Success 200 {number} number "size"
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
// @Router /continuous-profiling/group-profiles [get]
// @Param q query GetGroupProfileReq true "Query"
// @Security JwtAuth
// @Success 200 {array} GroupProfiles
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) conprofGroupProfiles(c *gin.Context) {
	// dummy, for generate openapi
}

// @Summary Get Group Profile Detail
// @Router /continuous-profiling/group-profile/detail [get]
// @Param ts query number true "timestamp"
// @Security JwtAuth
// @Success 200 {object} GroupProfileDetail
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) conprofGroupProfileDetail(c *gin.Context) {
	// dummy, for generate openapi
}

// @Summary Get action token for download or view profile
// @Router /continuous-profiling/action-token [get]
// @Param q query string true "target query string"
// @Security JwtAuth
// @Success 200 {string} string
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) genConprofActionToken(c *gin.Context) {
	q := c.Query("q")
	token, err := utils.NewJWTString("conprof", q)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.String(http.StatusOK, token)
}

// @Summary Download Group Profile files
// @Router /continuous-profiling/download [get]
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
// @Router /continuous-profiling/single-profile/view [get]
// @Param q query ViewSingleProfileReq true "Query"
// @Security JwtAuth
// @Produce html
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) conprofViewProfile(c *gin.Context) {
	// dummy, for generate openapi
}
