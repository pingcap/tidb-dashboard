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

package tidb

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-sql-driver/mysql"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"
	"k8s.io/kubernetes/cmd/kubeadm/app/phases/selfhosting"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/tcp"
)

// FIXME: This is duplicated with the one in KeyVis.
type tidbServerInfo struct {
	ID         string `json:"ddl_id"`
	IP         string `json:"ip"`
	Port       int    `json:"listening_port"`
	StatusPort uint   `json:"status_port"`
}

type ForwarderConfig struct {
	TiDBRetrieveTimeout time.Duration
	TiDBTLSConfig       *tls.Config
}

func NewForwarderConfig(cfg *config.Config) *ForwarderConfig {
	if cfg.TiDBTLSConfig != nil {
		_ = mysql.RegisterTLSConfig("tidb", cfg.TiDBTLSConfig)
	}
	return &ForwarderConfig{
		TiDBRetrieveTimeout: time.Second,
		TiDBTLSConfig:       cfg.TiDBTLSConfig,
	}
}

type Forwarder struct {
	ctx        context.Context
	config     *ForwarderConfig
	etcdClient *clientv3.Client
	pm  *tcp.ProxyManager
	mysqlPort int
	statusPort int
}

func (f *Forwarder) Open() error {
	cluster, err := f.getServerInfo()
	if err != nil {
		return err
	}
	var statusEndpoints, mysqlEndpoints []string
	for _, server := range cluster {
		statusEndpoints = append(statusEndpoints, fmt.Sprintf("%s:%s", server.IP, server.StatusPort))
		mysqlEndpoints = append(mysqlEndpoints, fmt.Sprintf("%s:%s", server.IP, server.Port))
	}
	pr, err := f.pm.Create("tidb", mysqlEndpoints)
	if err != nil {
		return err
	}
	f.mysqlPort = pr.Port
	pr, err = f.pm.Create("tidbStatus", statusEndpoints)
	if err != nil {
		return err
	}
	go func ()  {
		for {
			select {
			}
		}
	}
	f.statusPort = pr.Port
	pr.Run()
	return nil
}

func (f *Forwarder) Close() error {
	// Currently this function does nothing.
	return nil
}

func (f *Forwarder) getServerInfo() ([]*tidbServerInfo, error) {
	ctx, cancel := context.WithTimeout(f.ctx, f.config.TiDBRetrieveTimeout)
	resp, err := f.etcdClient.Get(ctx, pd.TiDBServerInformationPath, clientv3.WithPrefix())
	cancel()

	if err != nil {
		return nil, ErrPDAccessFailed.New("access PD failed: %s", err)
	}

	var allTiDB []*tidbServerInfo
	for _, kv := range resp.Kvs {
		var info *tidbServerInfo
		err = json.Unmarshal(kv.Value, &info)
		if err != nil {
			continue
		}
		allTiDB = append(allTiDB, info)
	}
	if len(info) == 0 {
		return nil, ErrNoAliveTiDB.New("no TiDB is alive")
	}

	return allTiDB, nil
}

func NewForwarder(lc fx.Lifecycle, config *ForwarderConfig, pm *tcp.ProxyManager etcdClient *clientv3.Client) *Forwarder {
	f := &Forwarder{
		etcdClient: etcdClient,
		config:     config,
		ctx:        context.Background(),
	}

	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			return f.Open()
		},
		OnStop: func(context.Context) error {
			return f.Close()
		},
	})

	return f
}
