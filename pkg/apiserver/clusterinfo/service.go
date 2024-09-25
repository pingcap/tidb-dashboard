// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// clusterinfo is a directory for ClusterInfoServer, which could load topology from pd
// using Etcd v3 interface and pd interface.

package clusterinfo

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/clusterinfo/hostinfo"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

type ServiceParams struct {
	fx.In
	PDClient   *pd.Client
	EtcdClient *clientv3.Client
	HTTPClient *httpc.Client
	TiDBClient *tidb.Client
}

type Service struct {
	params       ServiceParams
	lifecycleCtx context.Context
}

func NewService(lc fx.Lifecycle, p ServiceParams) *Service {
	s := &Service{params: p}
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			s.lifecycleCtx = ctx
			return nil
		},
	})
	return s
}

func RegisterRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/topology")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.GET("/tidb", s.getTiDBTopology)
	endpoint.GET("/ticdc", s.getTiCDCTopology)
	endpoint.GET("/tiproxy", s.getTiProxyTopology)
	endpoint.DELETE("/tidb/:address", s.deleteTiDBTopology)
	endpoint.GET("/store", s.getStoreTopology)
	endpoint.GET("/pd", s.getPDTopology)
	endpoint.GET("/tso", s.getTSOTopology)
	endpoint.GET("/scheduling", s.getSchedulingTopology)
	endpoint.GET("/alertmanager", s.getAlertManagerTopology)
	endpoint.GET("/alertmanager/:address/count", s.getAlertManagerCounts)
	endpoint.GET("/grafana", s.getGrafanaTopology)

	endpoint.GET("/store_location", s.getStoreLocationTopology)

	endpoint = r.Group("/host")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.Use(utils.MWConnectTiDB(s.params.TiDBClient))
	endpoint.GET("/all", s.getHostsInfo)
	endpoint.GET("/statistics", s.getStatistics)
}

// @Summary Hide a TiDB instance
// @Param address path string true "ip:port"
// @Success 200 "delete ok"
// @Failure 401 {object} rest.ErrorResponse
// @Security JwtAuth
// @Router /topology/tidb/{address} [delete]
func (s *Service) deleteTiDBTopology(c *gin.Context) {
	address := c.Param("address")
	errorChannel := make(chan error, 2)
	ttlKey := fmt.Sprintf("/topology/tidb/%v/ttl", address)
	nonTTLKey := fmt.Sprintf("/topology/tidb/%v/info", address)
	ctx, cancel := context.WithTimeout(s.lifecycleCtx, time.Second*5)
	defer cancel()

	var wg sync.WaitGroup
	for _, key := range []string{ttlKey, nonTTLKey} {
		wg.Add(1)
		go func(toDel string) {
			defer wg.Done()
			if _, err := s.params.EtcdClient.Delete(ctx, toDel); err != nil {
				errorChannel <- err
			}
		}(key)
	}
	wg.Wait()
	var err error
	select {
	case err = <-errorChannel:
	default:
	}
	close(errorChannel)

	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, nil)
}

// @ID getTiDBTopology
// @Summary Get all TiDB instances
// @Success 200 {array} topology.TiDBInfo
// @Router /topology/tidb [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getTiDBTopology(c *gin.Context) {
	instances, err := topology.FetchTiDBTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, instances)
}

// @ID getTiCDCTopology
// @Summary Get all TiCDC instances
// @Success 200 {array} topology.TiCDCInfo
// @Router /topology/ticdc [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getTiCDCTopology(c *gin.Context) {
	instances, err := topology.FetchTiCDCTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, instances)
}

// @ID getTiProxyTopology
// @Summary Get all TiProxy instances
// @Success 200 {array} topology.TiProxyInfo
// @Router /topology/tiproxy [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getTiProxyTopology(c *gin.Context) {
	instances, err := topology.FetchTiProxyTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, instances)
}

// @ID getTSOTopology
// @Summary Get all TSO instances
// @Success 200 {array} topology.TSOInfo
// @Router /topology/tso [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getTSOTopology(c *gin.Context) {
	instances, err := topology.FetchTSOTopology(s.lifecycleCtx, s.params.PDClient)
	if err != nil {
		// TODO: refine later
		if strings.Contains(err.Error(), "status code 404") {
			rest.Error(c, rest.ErrNotFound.Wrap(err, "api not found"))
		} else {
			rest.Error(c, err)
		}
		return
	}
	c.JSON(http.StatusOK, instances)
}

// @ID getSchedulingTopology
// @Summary Get all Scheduling instances
// @Success 200 {array} topology.SchedulingInfo
// @Router /topology/scheduling [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getSchedulingTopology(c *gin.Context) {
	instances, err := topology.FetchSchedulingTopology(s.lifecycleCtx, s.params.PDClient)
	if err != nil {
		// TODO: refine later
		if strings.Contains(err.Error(), "status code 404") {
			rest.Error(c, rest.ErrNotFound.Wrap(err, "api not found"))
		} else {
			rest.Error(c, err)
		}
		return
	}
	c.JSON(http.StatusOK, instances)
}

type StoreTopologyResponse struct {
	TiKV    []topology.StoreInfo `json:"tikv"`
	TiFlash []topology.StoreInfo `json:"tiflash"`
}

// @ID getStoreTopology
// @Summary Get all TiKV / TiFlash instances
// @Success 200 {object} StoreTopologyResponse
// @Router /topology/store [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getStoreTopology(c *gin.Context) {
	tikvInstances, tiFlashInstances, err := topology.FetchStoreTopology(s.params.PDClient)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, StoreTopologyResponse{
		TiKV:    tikvInstances,
		TiFlash: tiFlashInstances,
	})
}

// @ID getStoreLocationTopology
// @Summary Get location labels of all TiKV / TiFlash instances
// @Success 200 {object} topology.StoreLocation
// @Router /topology/store_location [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getStoreLocationTopology(c *gin.Context) {
	storeLocation, err := topology.FetchStoreLocation(s.params.PDClient)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, storeLocation)
}

// @ID getPDTopology
// @Summary Get all PD instances
// @Success 200 {array} topology.PDInfo
// @Router /topology/pd [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getPDTopology(c *gin.Context) {
	instances, err := topology.FetchPDTopology(s.params.PDClient)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, instances)
}

// @ID getAlertManagerTopology
// @Summary Get AlertManager instance
// @Success 200 {object} topology.AlertManagerInfo
// @Router /topology/alertmanager [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getAlertManagerTopology(c *gin.Context) {
	instance, err := topology.FetchAlertManagerTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, instance)
}

// @ID getGrafanaTopology
// @Summary Get Grafana instance
// @Success 200 {object} topology.GrafanaInfo
// @Router /topology/grafana [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getGrafanaTopology(c *gin.Context) {
	instance, err := topology.FetchGrafanaTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, instance)
}

// @ID getAlertManagerCounts
// @Summary Get current alert count from AlertManager
// @Success 200 {object} int
// @Param address path string true "ip:port"
// @Router /topology/alertmanager/{address}/count [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getAlertManagerCounts(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		rest.Error(c, rest.ErrBadRequest.New("address is empty"))
		return
	}
	info, err := topology.FetchAlertManagerTopology(c.Request.Context(), s.params.EtcdClient)
	if err != nil {
		rest.Error(c, err)
		return
	}
	if info == nil {
		rest.Error(c, rest.ErrBadRequest.New("alertmanager not found"))
		return
	}
	if address != fmt.Sprintf("%s:%d", info.IP, info.Port) {
		rest.Error(c, rest.ErrBadRequest.New("address not match"))
		return
	}
	cnt, err := fetchAlertManagerCounts(s.lifecycleCtx, address, s.params.HTTPClient)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, cnt)
}

type GetHostsInfoResponse struct {
	Hosts   []*hostinfo.Info   `json:"hosts"`
	Warning rest.ErrorResponse `json:"warning"`
}

// @ID clusterInfoGetHostsInfo
// @Summary Get information of all hosts
// @Router /host/all [get]
// @Security JwtAuth
// @Success 200 {object} GetHostsInfoResponse
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getHostsInfo(c *gin.Context) {
	db := utils.GetTiDBConnection(c)

	info, err := s.fetchAllHostsInfo(db)
	if err != nil && info == nil {
		rest.Error(c, err)
		return
	}

	var warning rest.ErrorResponse
	if err != nil {
		warning = rest.NewErrorResponse(err)
	}

	c.JSON(http.StatusOK, GetHostsInfoResponse{
		Hosts:   info,
		Warning: warning,
	})
}

// @ID clusterInfoGetStatistics
// @Summary Get cluster statistics
// @Router /host/statistics [get]
// @Security JwtAuth
// @Success 200 {object} ClusterStatistics
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getStatistics(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	stats, err := s.calculateStatistics(db)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}
