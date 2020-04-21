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

// clusterinfo is a directory for ClusterInfoServer, which could load topology from pd
// using Etcd v3 interface and pd interface.

package clusterinfo

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.etcd.io/etcd/clientv3"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/clusterinfo"
)

type Service struct {
	config        *config.Config
	etcdClient    *clientv3.Client
	httpClient    *http.Client
	tidbForwarder *tidb.Forwarder
}

func NewService(config *config.Config, etcdClient *clientv3.Client, httpClient *http.Client, tidbForwarder *tidb.Forwarder) *Service {
	return &Service{
		config:        config,
		etcdClient:    etcdClient,
		httpClient:    httpClient,
		tidbForwarder: tidbForwarder,
	}
}

func Register(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/topology")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.GET("/all", s.topologyHandler)
	endpoint.DELETE("/tidb/:address", s.deleteTiDBTopologyHandler)
	endpoint.GET("/alertmanager/:address/count", s.topologyGetAlertCount)

	endpoint = r.Group("/host")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.Use(utils.MWConnectTiDB(s.tidbForwarder))
	endpoint.GET("/all", s.hostHandler)
}

// @Summary Delete etcd's tidb key.
// @Description Delete etcd's TiDB key with ip:port.
// @Produce json
// @Param address path string true "ip:port"
// @Success 200 "delete ok"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Security JwtAuth
// @Router /topology/tidb/{address} [delete]
func (s *Service) deleteTiDBTopologyHandler(c *gin.Context) {
	address := c.Param("address")
	errorChannel := make(chan error, 2)
	ttlKey := fmt.Sprintf("/topology/tidb/%v/ttl", address)
	nonTTLKey := fmt.Sprintf("/topology/tidb/%v/info", address)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	var wg sync.WaitGroup
	for _, key := range []string{ttlKey, nonTTLKey} {
		wg.Add(1)
		go func(toDel string) {
			defer wg.Done()
			if _, err := s.etcdClient.Delete(ctx, toDel); err != nil {
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
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, nil)
}

// @Summary Get all Dashboard topology and liveness.
// @Description Get information about the dashboard topology.
// @Produce json
// @Success 200 {object} clusterinfo.ClusterInfo
// @Router /topology/all [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) topologyHandler(c *gin.Context) {
	var returnObject ClusterInfo

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	fetchers := []func(ctx context.Context, service *Service, info *ClusterInfo){
		fillTopologyUnderEtcd,
		fillStoreTopology,
		fillPDTopology,
	}

	var wg sync.WaitGroup
	for _, fetcher := range fetchers {
		wg.Add(1)
		currentFetcher := fetcher
		go func() {
			defer wg.Done()
			currentFetcher(ctx, s, &returnObject)
		}()
	}
	wg.Wait()

	c.JSON(http.StatusOK, returnObject)
}

// @Summary Get the count of alert
// @Description Get alert number of the alert manager.
// @Produce json
// @Success 200 {object} int
// @Param address path string true "ip:port"
// @Router /topology/alertmanager/{address}/count [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) topologyGetAlertCount(c *gin.Context) {
	address := c.Param("address")
	cnt, err := clusterinfo.GetAlertCountByAddress(address, s.httpClient)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, cnt)
}

// @Summary Get all host information in the cluster
// @Description Get information about host in the cluster
// @Produce json
// @Success 200 {array} HostInfo
// @Router /host/all [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) hostHandler(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var wg sync.WaitGroup

	var clusterInfo ClusterInfo
	fetchers := []func(ctx context.Context, service *Service, info *ClusterInfo){
		fillTopologyUnderEtcd,
		fillStoreTopology,
		fillPDTopology,
	}
	for _, fetcher := range fetchers {
		wg.Add(1)
		currentFetcher := fetcher
		go func() {
			defer wg.Done()
			currentFetcher(ctx, s, &clusterInfo)
		}()
	}

	var infos []HostInfo
	var err error
	wg.Add(1)
	go func() {
		defer wg.Done()
		infos, err = GetAllHostInfo(db)
	}()
	wg.Wait()

	if err != nil {
		_ = c.Error(err)
		return
	}

	allHosts := loadUnavailableHosts(clusterInfo)

OuterLoop:
	for _, host := range allHosts {
		for _, info := range infos {
			if host == info.IP {
				continue OuterLoop
			}
		}
		infos = append(infos, HostInfo{
			IP:          host,
			Unavailable: true,
		})
	}

	c.JSON(http.StatusOK, infos)
}

func loadUnavailableHosts(info ClusterInfo) []string {
	var allNodes []string
	for _, node := range info.TiDB.Nodes {
		if node.Status != clusterinfo.ComponentStatusUp {
			allNodes = append(allNodes, node.IP)
		}
	}
	for _, node := range info.TiKV.Nodes {
		switch node.Status {
		case clusterinfo.ComponentStatusUp,
			clusterinfo.ComponentStatusOffline,
			clusterinfo.ComponentStatusTombstone:
		default:
			allNodes = append(allNodes, node.IP)
		}
	}
	for _, node := range info.PD.Nodes {
		if node.Status != clusterinfo.ComponentStatusUp {
			allNodes = append(allNodes, node.IP)
		}
	}
	return allNodes
}
