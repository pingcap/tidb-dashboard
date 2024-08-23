// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package metrics

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/util/rest"
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
	endpoint.PUT("/prom_address", auth.MWRequireWritePriv(), s.putCustomPromAddress)
}

// @Summary Query metrics
// @Description Query metrics in the given range
// @Param q query QueryRequest true "Query"
// @Success 200 {object} QueryResponse
// @Failure 401 {object} rest.ErrorResponse
// @Security JwtAuth
// @Router /metrics/query [get]
func (s *Service) queryMetrics(c *gin.Context) {
	var req QueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	addr, err := s.getPromAddressFromCache()
	if err != nil {
		rest.Error(c, ErrLoadPrometheusAddressFailed.Wrap(err, "Load prometheus address failed"))
		return
	}
	if addr == "" {
		rest.Error(c, ErrPrometheusNotFound.New("Prometheus is not deployed in the cluster"))
		return
	}

	params := url.Values{}
	params.Add("query", req.Query)
	params.Add("start", strconv.Itoa(req.StartTimeSec))
	params.Add("end", strconv.Itoa(req.EndTimeSec))
	params.Add("step", strconv.Itoa(req.StepSec))

	uri := fmt.Sprintf("%s/api/v1/query_range?%s", addr, params.Encode())
	promReq, err := http.NewRequestWithContext(s.lifecycleCtx, http.MethodGet, uri, nil)
	if err != nil {
		rest.Error(c, ErrPrometheusQueryFailed.Wrap(err, "failed to build Prometheus request"))
		return
	}

	promResp, err := s.params.HTTPClient.WithTimeout(defaultPromQueryTimeout).Do(promReq)
	if err != nil {
		rest.Error(c, ErrPrometheusQueryFailed.Wrap(err, "failed to send requests to Prometheus"))
		return
	}

	defer promResp.Body.Close()
	if promResp.StatusCode != http.StatusOK {
		rest.Error(c, ErrPrometheusQueryFailed.New("failed to query Prometheus"))
		return
	}

	body, err := io.ReadAll(promResp.Body)
	if err != nil {
		rest.Error(c, ErrPrometheusQueryFailed.Wrap(err, "failed to read Prometheus query result"))
		return
	}

	c.Data(promResp.StatusCode, promResp.Header.Get("content-type"), body)
}

type GetPromAddressConfigResponse struct {
	CustomizedAddr string `json:"customized_addr"`
	DeployedAddr   string `json:"deployed_addr"`
}

// @ID metricsGetPromAddress
// @Summary Get the Prometheus address cluster config
// @Success 200 {object} GetPromAddressConfigResponse
// @Failure 401 {object} rest.ErrorResponse
// @Security JwtAuth
// @Router /metrics/prom_address [get]
func (s *Service) getPromAddressConfig(c *gin.Context) {
	cAddr, err := s.resolveCustomizedPromAddress(true)
	if err != nil {
		rest.Error(c, err)
		return
	}
	dAddr, err := s.resolveDeployedPromAddress()
	if err != nil {
		rest.Error(c, err)
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
// @Failure 401 {object} rest.ErrorResponse
// @Security JwtAuth
// @Router /metrics/prom_address [put]
func (s *Service) putCustomPromAddress(c *gin.Context) {
	var req PutCustomPromAddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	if s.params.Config.DisableCustomPromAddr && req.Addr != "" {
		rest.Error(c, rest.ErrForbidden.New("custom prometheus address has been disabled"))
		return
	}
	addr, err := s.setCustomPromAddress(req.Addr)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, PutCustomPromAddressResponse{
		NormalizedAddr: addr,
	})
}
