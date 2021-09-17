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
	"fmt"
	"io"
	"mime"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/endpoint"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
)

const (
	tokenIssuer = "debugAPI"
)

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	ep := r.Group("/debug_api")
	ep.GET("/download", s.Download)
	{
		ep.Use(auth.MWAuthRequired())
		ep.GET("/endpoints", s.GetEndpoints)
		ep.POST("/endpoint", s.RequestEndpoint)
	}
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
			panic(fmt.Sprintf("%s type client not found, id: %s", e.Component, e.ID))
		}
		s.endpointMap[e.ID] = endpointModel{APIModel: e, Client: client}
	}

	return s, nil
}

type RequestPayload struct {
	ID     string            `json:"id"`
	Host   string            `json:"host"`
	Port   int               `json:"port"`
	Params map[string]string `json:"params"`
}

func getExtFromContentTypeHeader(contentType string) string {
	mediaType, _, err := mime.ParseMediaType(contentType)
	if err != nil || len(mediaType) == 0 {
		return ".bin"
	}

	exts, err := mime.ExtensionsByType(mediaType)
	if err == nil && len(exts) > 0 {
		return exts[0]
	}

	return ".bin"
}

// @Summary Send request remote endpoint and return a token for downloading results
// @Security JwtAuth
// @ID debugAPIRequestEndpoint
// @Param req body RequestPayload true "request payload"
// @Success 200 {object} string
// @Failure 400 {object} utils.APIError "Bad request"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
// @Router /debug_api/endpoint [post]
func (s *Service) RequestEndpoint(c *gin.Context) {
	var req RequestPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}

	ep, ok := s.endpointMap[req.ID]
	if !ok {
		utils.MakeInvalidRequestErrorWithMessage(c, "Invalid endpoint id: %s", req.ID)
		return
	}
	endpointReq, err := ep.NewRequest(req.Host, req.Port, req.Params)
	if err != nil {
		_ = c.Error(err)
		return
	}

	res, err := SendRequest(ep.Client, endpointReq)
	if err != nil {
		_ = c.Error(err)
		return
	}
	defer res.Response.Body.Close() //nolint:errcheck

	ext := getExtFromContentTypeHeader(res.Header.Get("Content-Type"))
	fileName := fmt.Sprintf("%s_%d%s", req.ID, time.Now().Unix(), ext)

	writer, token, err := utils.FSPersist(utils.FSPersistConfig{
		TokenIssuer:      tokenIssuer,
		TokenExpire:      time.Minute * 5, // Note: the expire time should include request time.
		TempFilePattern:  "debug_api",
		DownloadFileName: fileName,
	})
	if err != nil {
		_ = c.Error(err)
		return
	}
	defer writer.Close() //nolint:errcheck
	_, err = io.Copy(writer, res.Response.Body)
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.String(http.StatusOK, token)
}

// @Summary Download a finished request result.
// @Param token query string true "download token"
// @Success 200 {object} string
// @Failure 400 {object} utils.APIError "Bad request"
// @Failure 500 {object} utils.APIError
// @Router /debug_api/download [get]
func (s *Service) Download(c *gin.Context) {
	token := c.Query("token")
	utils.FSServe(c, token, tokenIssuer)
}

// @Summary Get all endpoints
// @ID debugAPIGetEndpoints
// @Security JwtAuth
// @Success 200 {array} endpoint.APIModel
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Router /debug_api/endpoints [get]
func (s *Service) GetEndpoints(c *gin.Context) {
	c.JSON(http.StatusOK, endpoint.APIListDef)
}
