// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package debugapi

import (
	"fmt"
	"mime"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/endpoint"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/util/client/pdclient"
	"github.com/pingcap/tidb-dashboard/util/client/schedulingclient"
	"github.com/pingcap/tidb-dashboard/util/client/ticdcclient"
	"github.com/pingcap/tidb-dashboard/util/client/tidbclient"
	"github.com/pingcap/tidb-dashboard/util/client/tiflashclient"
	"github.com/pingcap/tidb-dashboard/util/client/tikvclient"
	"github.com/pingcap/tidb-dashboard/util/client/tiproxyclient"
	"github.com/pingcap/tidb-dashboard/util/client/tsoclient"
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

type ServiceParams struct {
	fx.In
	PDAPIClient            *pdclient.APIClient
	TiDBStatusClient       *tidbclient.StatusClient
	TiKVStatusClient       *tikvclient.StatusClient
	TiFlashStatusClient    *tiflashclient.StatusClient
	TiCDCStatusClient      *ticdcclient.StatusClient
	TiProxyStatusClient    *tiproxyclient.StatusClient
	EtcdClient             *clientv3.Client
	PDClient               *pd.Client
	TSOStatusClient        *tsoclient.StatusClient
	SchedulingStatusClient *schedulingclient.StatusClient
}

type Service struct {
	httpClients endpoint.HTTPClients
	etcdClient  *clientv3.Client
	pdClient    *pd.Client
	resolver    *endpoint.RequestPayloadResolver
	fSwap       *fileswap.Handler
}

func newService(p ServiceParams) *Service {
	httpClients := endpoint.HTTPClients{
		PDAPIClient:            p.PDAPIClient,
		TiDBStatusClient:       p.TiDBStatusClient,
		TiKVStatusClient:       p.TiKVStatusClient,
		TiFlashStatusClient:    p.TiFlashStatusClient,
		TiCDCStatusClient:      p.TiCDCStatusClient,
		TiProxyStatusClient:    p.TiProxyStatusClient,
		TSOStatusClient:        p.TSOStatusClient,
		SchedulingStatusClient: p.SchedulingStatusClient,
	}
	return &Service{
		httpClients: httpClients,
		etcdClient:  p.EtcdClient,
		pdClient:    p.PDClient,
		resolver:    endpoint.NewRequestPayloadResolver(apiEndpoints, httpClients),
		fSwap:       fileswap.New(),
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

	if mediaType == "application/toml" {
		return ".toml"
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
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	resolved, err := s.resolver.ResolvePayload(req)
	if err != nil {
		rest.Error(c, err)
		return
	}

	writer, err := s.fSwap.NewFileWriter("debug_api")
	if err != nil {
		rest.Error(c, err)
		return
	}
	defer func() {
		_ = writer.Close()
	}()

	resp, err := resolved.SendRequestAndPipe(c.Request.Context(), s.httpClients, s.etcdClient, s.pdClient, writer)
	if err != nil {
		rest.Error(c, err)
		return
	}

	ext := getExtFromContentTypeHeader(resp.Header.Get("Content-Type"))
	fileName := fmt.Sprintf("%s_%d%s", req.API, time.Now().Unix(), ext)
	downloadToken, err := writer.GetDownloadToken(fileName, time.Minute*5)
	if err != nil {
		// This shall never happen
		rest.Error(c, err)
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
