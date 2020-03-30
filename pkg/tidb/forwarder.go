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
	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/tcp"
)

const (
	tidbProxyLabel   = "tidb"
	statusProxyLable = "tidbStatus"
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
	ctx          context.Context
	config       *ForwarderConfig
	etcdClient   *clientv3.Client
	pm           *tcp.ProxyManager
	tidbPort     int
	statusPort   int
	donec        chan struct{}
	pollInterval time.Duration
}

func (f *Forwarder) Open() error {
	cluster, err := f.getServerInfo()
	if err != nil {
		return err
	}
	statusEndpoints := make(map[string]string)
	tidbEndpoints := make(map[string]string)
	for _, server := range cluster {
		statusEndpoints[server.ID] = fmt.Sprintf("%s:%d", server.IP, server.StatusPort)
		tidbEndpoints[server.ID] = fmt.Sprintf("%s:%d", server.IP, server.Port)
	}
	pr, err := f.pm.Create(tidbProxyLabel, tidbEndpoints)
	if err != nil {
		return err
	}
	go pr.Run()
	f.tidbPort = pr.Port
	pr, err = f.pm.Create(statusProxyLable, statusEndpoints)
	if err != nil {
		return err
	}
	f.statusPort = pr.Port
	go pr.Run()
	go f.pollingForTiDB()
	return nil
}

func (f *Forwarder) Close() error {
	p := f.pm.GetProxy(tidbProxyLabel)
	if p != nil {
		p.Stop()
	}
	p = f.pm.GetProxy(statusProxyLable)
	if p != nil {
		p.Stop()
	}
	close(f.donec)
	return nil
}

func (f *Forwarder) getServerInfo() ([]*tidbServerInfo, error) {
	ctx, cancel := context.WithTimeout(f.ctx, f.config.TiDBRetrieveTimeout)
	resp, err := f.etcdClient.Get(ctx, pd.TiDBServerInformationPath, clientv3.WithPrefix())
	cancel()

	if err != nil {
		return nil, ErrPDAccessFailed.New("access PD failed: %s", err)
	}

	allTiDB := []*tidbServerInfo{}
	for _, kv := range resp.Kvs {
		var info *tidbServerInfo
		err = json.Unmarshal(kv.Value, &info)
		if err != nil {
			continue
		}
		allTiDB = append(allTiDB, info)
	}
	if len(allTiDB) == 0 {
		return nil, ErrNoAliveTiDB.New("no TiDB is alive")
	}

	return allTiDB, nil
}

func (f *Forwarder) pollingForTiDB() {
	for {
		select {
		case <-time.After(f.pollInterval):
			allTiDB, err := f.getServerInfo()
			if err != nil {
				if errorx.IsOfType(err, ErrNoAliveTiDB) {
					log.Warn("no TiDB is alive now")
					f.pm.UpdateRemote(tidbProxyLabel, nil)
					f.pm.UpdateRemote(statusProxyLable, nil)
				} else {
					log.Warn("Fail to get TiDB server info from PD", zap.Error(err))
				}
				continue
			}
			statusEndpoints := make(map[string]string)
			tidbEndpoints := make(map[string]string)
			for _, server := range allTiDB {
				statusEndpoints[server.ID] = fmt.Sprintf("%s:%d", server.IP, server.StatusPort)
				tidbEndpoints[server.ID] = fmt.Sprintf("%s:%d", server.IP, server.Port)
			}
			f.pm.UpdateRemote(tidbProxyLabel, tidbEndpoints)
			f.pm.UpdateRemote(statusProxyLable, statusEndpoints)
		case <-f.donec:
			return
		}
	}
}

func NewForwarder(lc fx.Lifecycle, config *ForwarderConfig, pm *tcp.ProxyManager, etcdClient *clientv3.Client) *Forwarder {
	f := &Forwarder{
		etcdClient:   etcdClient,
		config:       config,
		pm:           pm,
		ctx:          context.Background(),
		pollInterval: 5 * time.Second,
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
