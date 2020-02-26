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
	pdclient "github.com/pingcap/pd/client"
	etcdclientv3 "go.etcd.io/etcd/clientv3"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

type Service struct {
	config  *config.Config
	etcdCli *etcdclientv3.Client
	pdCli   pdclient.Client
}

func NewService(config *config.Config, pdClient pdclient.Client, etcdClient *etcdclientv3.Client) *Service {
	return &Service{etcdCli: etcdClient, config: config, pdCli: pdClient}
}

func (s *Service) Register(r *gin.RouterGroup, auth *user.AuthService) {
	endpoint := r.Group("/topology")
	//endpoint.Use(auth.MWAuthRequired())
	endpoint.GET("/", s.topologyHandler)
	endpoint.DELETE("/tidb/:address/", s.deleteDBHandler)
}

// @Summary Delete etcd's tidb key.
// @Description Delete etcd's TiDB key with ip:port.
// @Produce json
// @Success 204 "delete ok"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Router /topology/address [delete]
func (s *Service) deleteDBHandler(c *gin.Context) {
	v, exists := c.Params.Get("address")
	if !exists {
		c.Status(400)
		_ = c.Error(fmt.Errorf("address not exists in path"))
		return
	}
	address := v
	ttlKey := fmt.Sprintf("/topology/tidb/%v/ttl", address)
	nonTTLKey := fmt.Sprintf("/topology/tidb/%v/info", address)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	var wg sync.WaitGroup
	for _, key := range []string{ttlKey, nonTTLKey} {
		wg.Add(1)
		go func(toDel string) {
			defer wg.Done()
			_, _ = s.etcdCli.Delete(ctx, toDel)
		}(key)
	}
	wg.Wait()

	c.JSON(http.StatusNoContent, nil)
}

type ResponseWithErr struct {
	TiDB         interface{} `json:"tidb"`
	TiKV         interface{} `json:"tikv"`
	Pd           interface{} `json:"pd"`
	Grafana      interface{} `json:"grafana"`
	AlertManager interface{} `json:"alert_manager"`
}

type ErrResp struct {
	Error string `json:"error"`
}

// @Summary Get all Dashboard topology and liveness.
// @Description Get information about the dashboard topology.
// @Produce json
// @Success 200 {object} clusterinfo.ClusterInfo
// @Router /topology [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) topologyHandler(c *gin.Context) {
	var returnObject ResponseWithErr

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	fetchers := []fetcher{
		topologyUnderEtcdFetcher{},
		tikvFetcher{},
		pdFetcher{},
	}

	var wg sync.WaitGroup
	for _, fetcher := range fetchers {
		wg.Add(1)
		currentFetcher := fetcher
		go func() {
			defer wg.Done()
			currentFetcher.fetch(ctx, &returnObject, s)
		}()
	}
	wg.Wait()

	c.JSON(http.StatusOK, returnObject)
}
