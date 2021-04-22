// Copyright 2021 PingCAP, Inc.
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

package debugapi

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/schema"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
)

var (
	ErrNS = errorx.NewNamespace("error.api.debugapi")
)

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/debugapi")
	endpoint.Use(auth.MWAuthRequired())

	endpoint.GET("/proxy", s.Proxy)
	endpoint.GET("/endpoint", s.GetEndpointList)
}

type Service struct {
	proxy *proxy
}

func newService() *Service {
	p := newProxy()
	for _, endpoint := range schema.EndpointAPIList {
		p.setupEndpoint(endpoint)
	}

	return &Service{proxy: p}
}

// @Summary Proxy request to tidb/tikv/tiflash/pd http api
// @Security JwtAuth
// @Success 200 {object} string
// @Failure 400 {object} utils.APIError "Bad request"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
// @Router /debugapi/proxy [get]
func (s *Service) Proxy(c *gin.Context) {
	proxyReq, err := s.proxy.request(c.Request)
	if err != nil {
		_ = c.Error(err)
		return
	}
	s.proxy.server.ServeHTTP(c.Writer, proxyReq)
}

// @Summary Get all endpoint configs
// @Security JwtAuth
// @Success 200 {array} schema.EndpointAPI
// @Failure 400 {object} utils.APIError "Bad request"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
// @Router /debugapi/endpoint [get]
func (s *Service) GetEndpointList(c *gin.Context) {
	c.JSON(http.StatusOK, schema.EndpointAPIList)
}
