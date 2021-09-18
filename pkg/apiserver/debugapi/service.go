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
	"github.com/joomcode/errorx"

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

type Service struct {
	Client *endpoint.Client
}

func newService(hp httpClientParam) *Service {
	return &Service{
		Client: endpoint.NewClient(newHTTPClient(hp), endpointDefs),
	}
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
// @Param req body endpoint.RequestPayload true "request payload"
// @Success 200 {object} string
// @Failure 400 {object} utils.APIError "Bad request"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
// @Router /debug_api/endpoint [post]
func (s *Service) RequestEndpoint(c *gin.Context) {
	var req endpoint.RequestPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}

	res, err := s.Client.Send(&req)
	if err != nil {
		_ = c.Error(err)
		if errorx.IsOfType(err, endpoint.ErrInvalidParam) {
			c.Status(http.StatusBadRequest)
		}
		return
	}
	defer res.Response.Body.Close() //nolint:errcheck

	ext := getExtFromContentTypeHeader(res.Header.Get("Content-Type"))
	fileName := fmt.Sprintf("%s_%d%s", req.EndpointID, time.Now().Unix(), ext)

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
	c.JSON(http.StatusOK, s.Client.GetAllAPIModels())
}
