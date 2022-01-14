// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package debugapi

import (
	"fmt"
	"mime"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/endpoint"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/util/clientbundle"
	"github.com/pingcap/tidb-dashboard/util/rest"
	"github.com/pingcap/tidb-dashboard/util/rest/fileswap"
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
	httpClients clientbundle.HTTPClientBundle
	resolver    *endpoint.RequestPayloadResolver
	fSwap       *fileswap.Controller
}

func newService(httpClients clientbundle.HTTPClientBundle) *Service {
	return &Service{
		httpClients: httpClients,
		resolver:    endpoint.NewRequestPayloadResolver(apiEndpoints, httpClients),
		fSwap:       fileswap.NewController(),
	}
}

func getExtFromContentTypeHeader(contentType string) string {
	mediaType, _, err := mime.ParseMediaType(contentType)
	if err != nil || len(mediaType) == 0 {
		return ".bin"
	}

	// Some explicit overrides
	if mediaType == "text/plain" {
		return ".txt"
	}

	exts, err := mime.ExtensionsByType(mediaType)
	if err == nil && len(exts) > 0 {
		// Note: the first element might not be the most common one
		return exts[0]
	}

	return ".bin"
}

// @Summary Send request remote endpoint and return a token for downloading results
// @Security JwtAuth
// @ID debugAPIRequestEndpoint
// @Param req body endpoint.RequestPayload true "request payload"
// @Success 200 {object} string
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
// @Router /debug_api/endpoint [post]
func (s *Service) RequestEndpoint(c *gin.Context) {
	var req endpoint.RequestPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	resolved, err := s.resolver.ResolvePayload(req)
	if err != nil {
		_ = c.Error(err)
		return
	}

	writer, err := s.fSwap.NewFileWriter("debug_api")
	if err != nil {
		_ = c.Error(err)
		return
	}
	defer func() {
		_ = writer.Close()
	}()

	resp, err := resolved.SendRequestAndPipe(s.httpClients, writer)
	if err != nil {
		_ = c.Error(err)
		return
	}

	ext := getExtFromContentTypeHeader(resp.Header.Get("Content-Type"))
	fileName := fmt.Sprintf("%s_%d%s", req.API, time.Now().Unix(), ext)
	downloadToken, err := writer.GetDownloadToken(fileName, time.Minute*5)
	if err != nil {
		// This shall never happen
		_ = c.Error(err)
		return
	}

	c.String(http.StatusOK, downloadToken)
}

// @Summary Download a finished request result
// @Param token query string true "download token"
// @Success 200 {object} string
// @Failure 400 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
// @Router /debug_api/download [get]
func (s *Service) Download(c *gin.Context) {
	s.fSwap.HandleDownloadRequest(c)
}

// @Summary Get all endpoints
// @ID debugAPIGetEndpoints
// @Security JwtAuth
// @Success 200 {array} endpoint.APIDefinition
// @Failure 401 {object} rest.ErrorResponse
// @Router /debug_api/endpoints [get]
func (s *Service) GetEndpoints(c *gin.Context) {
	c.JSON(http.StatusOK, s.resolver.ListAPIs())
}
