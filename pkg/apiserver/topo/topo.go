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

package topo

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strings"
	"sync"
	"time"

	etcdclientv3 "github.com/coreos/etcd/clientv3"
	"github.com/gin-gonic/gin"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

type Topology struct {
	Grafana      string   `json:"grafana"`
	Alertmanager string   `json:"alertmanager"`
	TiKV         []string `json:"tikv"`
	TiDB         []string `json:"tidb"`
	PD           []string `json:"pd"`
}

type Service struct {
	config *config.Config
	etcd   *etcdclientv3.Client
}

func NewService(config *config.Config) *Service {
	cli, err := etcdclientv3.New(etcdclientv3.Config{
		Endpoints:   []string{config.PDEndPoint},
		DialTimeout: 5 * time.Second,
	})
	if err != nil {
		// handle error!
		return nil
	}

	return &Service{etcd: cli, config: config}
}

func (s *Service) Register(r *gin.RouterGroup) {
	endpoint := r.Group("/topo")
	endpoint.GET("/", s.topologyHandler)
}

// @Summary Dashboard info
// @Description Get information about the dashboard service.
// @Produce json
// @Success 200 {object} Topology
// @Router /topo [get]
func (s *Service) topologyHandler(c *gin.Context) {

	dataMap := sync.Map{}
	wg := sync.WaitGroup{}

	namespace := "/topo/"
	etcdPoints := []string{"alertmanager", "tidb", "grafana"}

	for _, key := range etcdPoints {
		wg.Add(1)
		go func(k string) {
			defer wg.Done()
			dataMap.Store(k, s.etcdLoad(namespace+k))
		}(key)
	}

	// using pd http api to load pd peers and tikv peers
	var pdAddresses []string
	var kvAddresses []string

	wg.Add(1)
	go func() {
		defer wg.Done()
		pdAddresses = s.pdLoad()
	}()

	go func() {
		defer wg.Done()
		kvAddresses = s.tikvLoad()
	}()

	wg.Wait()

	c.JSON(http.StatusOK, Topology{
		Grafana:      must(dataMap.Load("grafana")),
		Alertmanager: must(dataMap.Load("alertmanager")),
		TiKV:         pdAddresses,
		TiDB:         parseArray(must(dataMap.Load("tidb"))),
		PD:           kvAddresses,
	})
}

func must(value interface{}, ok bool) string {
	if !ok {
		panic("")
	}
	v, ok := value.(string)
	if !ok {
		panic("")
	}
	return v
}

// parseArray will parse addresses like "address1, address2, ..., addressN"
// to array [address1, address2, ..., addressN].
func parseArray(input string) []string {
	array := make([]string, 0)
	for _, s := range strings.Split(input, ",") {
		array = append(array, strings.Trim(s, " "))
	}
	return array
}

func (s *Service) etcdLoad(key string) string {
	resp, err := s.etcd.Get(context.TODO(), key)
	if err != nil {

	}
	if resp == nil {
		// TODO: should not panic
		panic("resp == nil")
	}
	return string(resp.Kvs[0].Value)
}

func (s *Service) tikvLoad() []string {
	stores := struct {
		Count  int
		Stores []struct {
			Store struct {
				Address string
			}
		}
	}{}

	resp, err := http.Get(s.config.PDEndPoint + "/pd/api/v1/members")
	if err != nil {

	}
	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {

	}

	err = json.Unmarshal(data, &stores)
	if err != nil {

	}
	address := make([]string, stores.Count, stores.Count)
	for i, kv := range stores.Stores {
		address[i] = kv.Store.Address
	}

	return address
}

func (s *Service) pdLoad() []string {
	resp, err := http.Get(s.config.PDEndPoint + "/pd/api/v1/members")
	if err != nil {

	}
	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {

	}
	ds := struct {
		Members struct {
			ClientUrls []string
		}
	}{}
	err = json.Unmarshal(data, &ds)
	if err != nil {

	}
	return ds.Members.ClientUrls
}
