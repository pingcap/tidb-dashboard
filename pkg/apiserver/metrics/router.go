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

package metrics

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
)

type QueryRequest struct {
	StartTimeSec int    `json:"start_time_sec" form:"start_time_sec"`
	EndTimeSec   int    `json:"end_time_sec" form:"end_time_sec"`
	StepSec      int    `json:"step_sec" form:"step_sec"`
	Query        string `json:"query" form:"query"`
}

type QueryResponse struct {
	Status string                 `json:"status"`
	Data   map[string]interface{} `json:"data"`
}

func RegisterRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/metrics")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.GET("/query", s.queryMetrics)
	endpoint.GET("/prom_address", s.getPromAddressConfig)
	endpoint.PUT("/prom_address", s.putCustomPromAddress)
}

// @Summary Query metrics
// @Description Query metrics in the given range
// @Param q query QueryRequest true "Query"
// @Success 200 {object} QueryResponse
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Security JwtAuth
// @Router /metrics/query [get]
func (s *Service) queryMetrics(c *gin.Context) {
	var req QueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}

	addr, err := s.getPromAddressFromCache()
	if err != nil {
		_ = c.Error(ErrLoadPrometheusAddressFailed.Wrap(err, "Load prometheus address failed"))
		return
	}
	if addr == "" {
		_ = c.Error(ErrPrometheusNotFound.New("Prometheus is not deployed in the cluster"))
		return
	}

	params := url.Values{}
	params.Add("query", req.Query)
	params.Add("start", strconv.Itoa(req.StartTimeSec))
	params.Add("end", strconv.Itoa(req.EndTimeSec))
	params.Add("step", strconv.Itoa(req.StepSec))

	uri := fmt.Sprintf("%s/api/v1/query_range?%s", addr, params.Encode())
	resp, err := s.params.HTTPClient.New().
		SetTimeout(defaultPromQueryTimeout).
		R().
		SetContext(s.lifecycleCtx).
		Get(uri)
	if err != nil {
		_ = c.Error(ErrPrometheusQueryFailed.Wrap(err, "failed to send requests to Prometheus"))
		return
	}

	c.Data(resp.StatusCode(), resp.Header().Get("content-type"), resp.Body())
}

type GetPromAddressConfigResponse struct {
	CustomizedAddr string `json:"customized_addr"`
	DeployedAddr   string `json:"deployed_addr"`
}

// @ID metricsGetPromAddress
// @Summary Get the Prometheus address cluster config
// @Success 200 {object} GetPromAddressConfigResponse
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Security JwtAuth
// @Router /metrics/prom_address [get]
func (s *Service) getPromAddressConfig(c *gin.Context) {
	cAddr, err := s.resolveCustomizedPromAddress(true)
	if err != nil {
		_ = c.Error(err)
		return
	}
	dAddr, err := s.resolveDeployedPromAddress()
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, GetPromAddressConfigResponse{
		CustomizedAddr: cAddr,
		DeployedAddr:   dAddr,
	})
}

type PutCustomPromAddressRequest struct {
	Addr string `json:"address"`
}

type PutCustomPromAddressResponse struct {
	NormalizedAddr string `json:"normalized_address"`
}

// @ID metricsSetCustomPromAddress
// @Summary Set or clear the customized Prometheus address
// @Param request body PutCustomPromAddressRequest true "Request body"
// @Success 200 {object} PutCustomPromAddressResponse
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Security JwtAuth
// @Router /metrics/prom_address [put]
func (s *Service) putCustomPromAddress(c *gin.Context) {
	var req PutCustomPromAddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}
	addr, err := s.setCustomPromAddress(req.Addr)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, PutCustomPromAddressResponse{
		NormalizedAddr: addr,
	})
}
