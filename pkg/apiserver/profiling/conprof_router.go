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
	"net/http/httputil"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
)

var (
	ConProfErrNS                  = errorx.NewNamespace("error.api.continuous_profiling")
	ErrLoadNgMonitoringAddrFailed = ConProfErrNS.NewType("load_ng_monitoring_addr_failed")
	ErrNgMonitoringNotStart       = ConProfErrNS.NewType("ng_monitoring_not_start")
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

	// TODO: add auth middleware
	conprofEndpoint.GET("/config", s.reverseProxy("/config"), s.getConprofConfig)
	conprofEndpoint.POST("/config", s.reverseProxy("/config"), s.updateConprofConfig)
	conprofEndpoint.GET("/estimate-size", s.reverseProxy("/continuous-profiling/estimate-size"), s.estimateSize)
	conprofEndpoint.POST("/list", s.reverseProxy("/continuous-profiling/list"), s.list)
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

		// Cache is not valid, read from PD and etcd.
		addr, err := s.resolveNgMonitoringAddress()
		if err != nil {
			return "", err
		}

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

func (s *Service) reverseProxy(targetPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ngMonitoringAddr, err := s.getNgMonitoringAddrFromCache()
		if err != nil {
			_ = c.Error(ErrLoadNgMonitoringAddrFailed.Wrap(err, "Load ng monitoring address failed"))
			return
		}
		if ngMonitoringAddr == "" {
			_ = c.Error(ErrNgMonitoringNotStart.New("Ng monitoring is not started"))
			return
		}

		ngMonitoringURL, _ := url.Parse(ngMonitoringAddr)
		proxy := httputil.NewSingleHostReverseProxy(ngMonitoringURL)
		c.Request.URL.Path = targetPath
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}

func (s *Service) resolveNgMonitoringAddress() (string, error) {
	addr, err := topology.FetchNgMonitoringTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err != nil {
		return "", err
	}
	if addr == "" {
		return "", nil
	}
	return fmt.Sprintf("http://%s", addr), nil
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

type ProfileTarget struct {
	Kind      string `json:"kind"`
	Component string `json:"component"`
	Address   string `json:"address"`
}

type ListReq struct {
	Begin   int64           `json:"begin_time"`
	End     int64           `json:"end_time"`
	Targets []ProfileTarget `json:"targets"`
}

type ProfileList struct {
	Target ProfileTarget `json:"target"`
	TsList []int64       `json:"timestamp_list"`
}

// @Summary Get Continuous Profiling Config
// @Success 200 {object} NgMonitoringConfig
// @Router /continuous-profiling/config [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) getConprofConfig(c *gin.Context) {
	// dummy, for generate open api
}

// @Summary Update Continuous Profiling Config
// @Router /continuous-profiling/config [post]
// @Param request body NgMonitoringConfig true "Request body"
// @Security JwtAuth
// @Success 200 {string} string "ok"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) updateConprofConfig(c *gin.Context) {
	// dummy, for generate open api
}

// @Summary Get Estimate Size
// @Router /continuous-profiling/estimate-size [get]
// @Param days query number true "days"
// @Security JwtAuth
// @Success 200 {number} number "size"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) estimateSize(c *gin.Context) {
	// dummy, for generate open api
}

// @Summary Get Continuous Profiling List
// @Router /continuous-profiling/list [post]
// @Param request body ListReq true "Request body"
// @Security JwtAuth
// @Success 200 {array} ProfileList
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) list(c *gin.Context) {
	// dummy, for generate open api
}
