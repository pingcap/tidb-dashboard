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

// topo is a directory for TopoServer, which could load topology from pd
// using Etcd v3 interface and pd interface.

package clusterinfo

import (
	"context"
	"net/http"
	"sync"
	"time"

	etcdclientv3 "github.com/coreos/etcd/clientv3"
	"github.com/gin-gonic/gin"
	pdclient "github.com/pingcap/pd/client"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/clusterinfo"
)

type ClusterInfo struct {
	TiDB         []clusterinfo.TiDB
	TiKV         []clusterinfo.TiKV
	Pd           []clusterinfo.PD
	Grafana      clusterinfo.Grafana
	AlertManager clusterinfo.AlertManager
	Prom         clusterinfo.Prometheus
}

type Service struct {
	config  *config.Config
	etcdCli *etcdclientv3.Client
	pdCli   pdclient.Client
}

func NewService(config *config.Config) *Service {
	peers := []string{config.PDEndPoint}
	cli, err := etcdclientv3.New(etcdclientv3.Config{
		Endpoints:   peers,
		DialTimeout: 5 * time.Second,
	})
	if err != nil {
		// handle error!
		return nil
	}
	// TODO: adding security later.
	pdcli, err := pdclient.NewClient(peers, pdclient.SecurityOption{})

	return &Service{etcdCli: cli, config: config, pdCli: pdcli}
}

func (s *Service) Register(r *gin.RouterGroup) {
	endpoint := r.Group("/topology")
	endpoint.GET("/", s.topologyHandler)
}

// @Summary Dashboard info
// @Description Get information about the dashboard service.
// @Produce json
// @Success 200 {object} Topology
// @Router /topo [get]
func (s *Service) topologyHandler(c *gin.Context) {
	wg := sync.WaitGroup{}

	var returnObject ClusterInfo

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	//ctx, cancelFunc := context.WithCancel(ctx)
	defer cancel()

	fetchers := []Fetcher{
		FetchEtcd{},
		TiKVFetcher{},
		PDFetcher{},
	}

	// Note: if here we want to check healthy, we can support to generate fetcher in the
	// sub goroutine.
	for _, fetcher := range fetchers {
		wg.Add(1)
		go func(f Fetcher) {
			defer wg.Done()
			f.Fetch(ctx, &returnObject, s)
		}(fetcher)
	}

	wg.Wait()

	c.JSON(http.StatusOK, returnObject)
}
