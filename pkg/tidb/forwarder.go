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
	"net"
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/go-sql-driver/mysql"
	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"
)

type tidbServerInfo struct {
	ID         string `json:"ddl_id"`
	IP         string `json:"ip"`
	Port       int    `json:"listening_port"`
	StatusPort uint   `json:"status_port"`
}

type ForwarderConfig struct {
	TiDBTLSConfig       *tls.Config
	TiDBRetrieveTimeout time.Duration
	TiDBPollInterval    time.Duration
	ProxyTimeout        time.Duration
	ProxyCheckInterval  time.Duration
}

func NewForwarderConfig(cfg *config.Config) *ForwarderConfig {
	if cfg.TiDBTLSConfig != nil {
		_ = mysql.RegisterTLSConfig("tidb", cfg.TiDBTLSConfig)
	}
	return &ForwarderConfig{
		TiDBTLSConfig:       cfg.TiDBTLSConfig,
		TiDBRetrieveTimeout: time.Second,
		TiDBPollInterval:    5 * time.Second,
		ProxyTimeout:        3 * time.Second,
		ProxyCheckInterval:  2 * time.Second,
	}
}

type Forwarder struct {
	ctx context.Context

	config     *ForwarderConfig
	etcdClient *clientv3.Client

	tidbProxy       *proxy
	tidbStatusProxy *proxy
	tidbPort        int
	statusPort      int
}

func (f *Forwarder) Start(ctx context.Context) error {
	f.ctx = ctx

	var err error
	if f.tidbProxy, err = f.createProxy(); err != nil {
		return err
	}
	if f.tidbStatusProxy, err = f.createProxy(); err != nil {
		return err
	}

	f.tidbPort = f.tidbProxy.port()
	f.statusPort = f.tidbStatusProxy.port()

	go f.pollingForTiDB()
	go f.tidbProxy.run(ctx)
	go f.tidbStatusProxy.run(ctx)

	return nil
}

func (f *Forwarder) getServerInfo() ([]*tidbServerInfo, error) {
	ctx, cancel := context.WithTimeout(f.ctx, f.config.TiDBRetrieveTimeout)
	resp, err := f.etcdClient.Get(ctx, pd.TiDBServerInformationPath, clientv3.WithPrefix())
	cancel()

	if err != nil {
		log.Warn("Fail to get TiDB server info from PD", zap.Error(err))
		return nil, ErrPDAccessFailed.WrapWithNoMessage(err)
	}

	allTiDB := make([]*tidbServerInfo, 0, len(resp.Kvs))
	for _, kv := range resp.Kvs {
		var info *tidbServerInfo
		err = json.Unmarshal(kv.Value, &info)
		if err != nil {
			continue
		}
		allTiDB = append(allTiDB, info)
	}
	if len(allTiDB) == 0 {
		log.Warn("No TiDB is alive now")
		return nil, backoff.Permanent(ErrNoAliveTiDB.NewWithNoMessage())
	}

	return allTiDB, nil
}

func (f *Forwarder) createProxy() (*proxy, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, err
	}
	proxy := newProxy(l, nil, f.config.ProxyCheckInterval, f.config.ProxyTimeout)
	return proxy, nil
}

func (f *Forwarder) pollingForTiDB() {
	ebo := backoff.NewExponentialBackOff()
	ebo.MaxInterval = f.config.TiDBPollInterval
	bo := backoff.WithContext(ebo, f.ctx)

	for {
		var allTiDB []*tidbServerInfo
		err := backoff.Retry(func() error {
			var err error
			allTiDB, err = f.getServerInfo()
			return err
		}, bo)
		if err != nil {
			if errorx.IsOfType(err, ErrNoAliveTiDB) {
				f.tidbProxy.updateRemotes(nil)
				f.tidbStatusProxy.updateRemotes(nil)
			}
		} else {
			statusEndpoints := make(map[string]struct{}, len(allTiDB))
			tidbEndpoints := make(map[string]struct{}, len(allTiDB))
			for _, server := range allTiDB {
				tidbEndpoints[fmt.Sprintf("%s:%d", server.IP, server.Port)] = struct{}{}
				statusEndpoints[fmt.Sprintf("%s:%d", server.IP, server.StatusPort)] = struct{}{}
			}
			f.tidbProxy.updateRemotes(tidbEndpoints)
			f.tidbStatusProxy.updateRemotes(statusEndpoints)
		}

		select {
		case <-f.ctx.Done():
			return
		case <-time.After(f.config.TiDBPollInterval):
		}
	}
}

func NewForwarder(lc fx.Lifecycle, config *ForwarderConfig, etcdClient *clientv3.Client) *Forwarder {
	f := &Forwarder{
		etcdClient: etcdClient,
		config:     config,
	}

	lc.Append(fx.Hook{
		OnStart: f.Start,
	})

	return f
}
