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

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/endpoint"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
)

var (
	ErrNS                = errorx.NewNamespace("error.api.debugapi")
	ErrComponentClient   = ErrNS.NewType("invalid_component_client")
	ErrEndpointConfig    = ErrNS.NewType("invalid_endpoint_config")
	ErrInvalidStatusPort = ErrNS.NewType("invalid_status_port")
)

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/debugapi")
	endpoint.Use(auth.MWAuthRequired())

	endpoint.POST("/request_endpoint", s.RequestEndpoint)
	endpoint.GET("/endpoints", s.GetEndpointList)
}

type endpointModel struct {
	endpoint.APIModel
	Client Client
}

type Service struct {
	endpointMap map[string]endpointModel
}

func newService(clientMap *ClientMap) (*Service, error) {
	s := &Service{endpointMap: map[string]endpointModel{}}

	for _, e := range endpoint.APIListDef {
		client, ok := (*clientMap)[e.Component]
		if !ok {
			panic(ErrComponentClient.New("%s type client not found, id: %s", e.Component, e.ID))
		}
		s.endpointMap[e.ID] = endpointModel{APIModel: e, Client: client}
	}

	return s, nil
}

type EndpointRequest struct {
	ID     string            `json:"id"`
	Host   string            `json:"host"`
	Port   int               `json:"port"`
	Params map[string]string `json:"params"`
}

// @Summary RequestEndpoint send request to tidb/tikv/tiflash/pd http api
// @Security JwtAuth
// @Param req body EndpointRequest true "endpoint request param"
// @Success 200 {object} string
// @Failure 400 {object} utils.APIError "Bad request"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
// @Router /debugapi/request_endpoint [post]
func (s *Service) RequestEndpoint(c *gin.Context) {
	var req EndpointRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}

	endpoint, ok := s.endpointMap[req.ID]
	if !ok {
		_ = c.Error(ErrEndpointConfig.New("invalid endpoint id: %s", req.ID))
		return
	}
	endpointReq, err := endpoint.NewRequest(req.Host, req.Port, req.Params)
	if err != nil {
		_ = c.Error(err)
		return
	}

	res, err := endpoint.Client.Send(endpointReq)
	if err != nil {
		_ = c.Error(err)
		return
	}
	body, err := res.Body()
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.Data(200, res.Header.Get("Content-Type"), body)
}

// @Summary Get all endpoint configs
// @Security JwtAuth
// @Success 200 {array} endpoint.APIModel
// @Failure 400 {object} utils.APIError "Bad request"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
// @Router /debugapi/endpoints [get]
func (s *Service) GetEndpointList(c *gin.Context) {
	c.JSON(http.StatusOK, endpoint.APIListDef)
}
