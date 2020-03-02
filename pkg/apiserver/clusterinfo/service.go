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

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"
)

type Service struct {
	config       *config.Config
	etcdProvider pd.EtcdProvider
	httpClient   *http.Client
}

func NewService(config *config.Config, etcdProvider pd.EtcdProvider, httpClient *http.Client) *Service {
	return &Service{config: config, etcdProvider: etcdProvider, httpClient: httpClient}
}

func (s *Service) Register(r *gin.RouterGroup, auth *user.AuthService) {
	endpoint := r.Group("/topology")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.GET("/all", s.topologyHandler)
	endpoint.DELETE("/tidb/:address/", s.deleteTiDBTopologyHandler)
}

// @Summary Delete etcd's tidb key.
// @Description Delete etcd's TiDB key with ip:port.
// @Produce json
// @Success 204 "delete ok"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Router /topology/address [delete]
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
			if _, err := s.etcdProvider.GetEtcdClient().Delete(ctx, toDel); err != nil {
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
		fillTiKVTopology,
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
