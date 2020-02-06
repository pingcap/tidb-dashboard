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
	"errors"
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
	errMap := sync.Map{}
	wg := sync.WaitGroup{}

	namespace := "/topo/"
	etcdPoints := []string{"alertmanager", "tidb", "grafana"}

	for _, key := range etcdPoints {
		wg.Add(1)
		go func(k string) {
			defer wg.Done()
			v, err := s.etcdLoad(namespace + k)
			if err != nil {
				errMap.Store(k, err)
				return
			}
			if v != "" {
				dataMap.Store(k, v)
			}
		}(key)
	}

	// using pd http api to load pd peers and tikv peers
	var pdAddresses []string
	var kvAddresses []string

	wg.Add(2)

	go func() {
		defer wg.Done()
		var err error
		pdAddresses, err = s.pdLoad()
		if err != nil {
			errMap.Store("pd", err)
		}
	}()

	go func() {
		defer wg.Done()
		var err error
		kvAddresses, err = s.tikvLoad()
		if err != nil {
			errMap.Store("tikv", err)
		}
	}()

	wg.Wait()

	for _, v := range etcdPoints {
		e, exists := errMap.Load(v)
		if !exists {
			continue
		}
		err, ok := e.(error)
		if !ok {
			continue
		}
		c.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, Topology{
		Grafana:      convert(dataMap.Load("grafana")),
		Alertmanager: convert(dataMap.Load("alertmanager")),
		TiKV:         kvAddresses,
		TiDB:         parseArray(convert(dataMap.Load("tidb"))),
		PD:           pdAddresses,
	})
}

func convert(value interface{}, ok bool) string {
	if !ok {
		return ""
	}
	v, ok := value.(string)
	if !ok {
		// maybe we should return err
		return ""
	}
	return v
}

// parseArray will parse addresses like "address1, address2, ..., addressN"
// to array [address1, address2, ..., addressN].
// If input is "", it will return [""]
func parseArray(input string) []string {
	array := make([]string, 0)
	for _, s := range strings.Split(input, ",") {
		array = append(array, strings.Trim(s, " "))
	}
	return array
}

// etcdLoad load key like "/topo/tidb" from pd's embedded etcd.
// If the key doesn't exists, it will just return "", nil.
// Otherwise, it will return value, nil.
func (s *Service) etcdLoad(key string) (string, error) {
	resp, err := s.etcd.Get(context.TODO(), key)
	if err != nil {
		return "", err
	}
	if len(resp.Kvs) == 0 {
		return "", nil
	}
	return string(resp.Kvs[0].Value), nil
}

func (s *Service) tikvLoad() ([]string, error) {
	resp, err := http.Get(s.config.PDEndPoint + "/pd/api/v1/stores")
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != 200 {
		b, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			return nil, err
		}
		if resp.StatusCode == 500 && strings.Contains(string(b), "please start TiKV first") {
			return []string{}, nil
		}
		return nil, errors.New(string(b))
	}

	defer resp.Body.Close()

	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	stores := struct {
		Count  int `json:"count"`
		Stores []struct {
			Store struct {
				Address string `json:"address"`
			} `json:"store"`
		}
	}{}

	err = json.Unmarshal(data, &stores)
	if err != nil {
		return nil, err
	}
	address := make([]string, stores.Count, stores.Count)
	for i, kv := range stores.Stores {
		address[i] = kv.Store.Address
	}

	return address, nil
}

func (s *Service) pdLoad() ([]string, error) {
	resp, err := http.Get(s.config.PDEndPoint + "/pd/api/v1/members")
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != 200 {
		// TODO: add handling logic
	}
	data, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		return nil, err
	}

	ds := struct {
		Members []struct {
			ClientUrls []string `json:"client_urls"`
		} `json:"members"`
	}{}

	err = json.Unmarshal(data, &ds)
	if err != nil {
		return nil, err
	}
	rets := make([]string, 0)
	for _, ds := range ds.Members {
		rets = append(rets, ds.ClientUrls...)
	}
	return rets, nil
}
