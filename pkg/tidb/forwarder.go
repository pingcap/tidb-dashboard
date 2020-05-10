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
	CheckInterval       time.Duration
}

func NewForwarderConfig(cfg *config.Config) *ForwarderConfig {
	if cfg.TiDBTLSConfig != nil {
		_ = mysql.RegisterTLSConfig("tidb", cfg.TiDBTLSConfig)
	}
	return &ForwarderConfig{
		TiDBRetrieveTimeout: time.Second,
		TiDBTLSConfig:       cfg.TiDBTLSConfig,
		CheckInterval:       cfg.CheckInterval,
	}
}

type Forwarder struct {
	ctx             context.Context
	config          *ForwarderConfig
	etcdClient      *clientv3.Client
	tidbProxy       *proxy
	tidbStatusProxy *proxy
	tidbPort        int
	statusPort      int
	donec           chan struct{}
	pollInterval    time.Duration
}

func (f *Forwarder) Open() error {
	pr, err := f.createProxy()
	if err != nil {
		return err
	}
	f.tidbProxy = pr
	f.tidbPort = pr.port()
	pr, err = f.createProxy()
	if err != nil {
		return err
	}
	f.tidbStatusProxy = pr
	f.statusPort = pr.port()
	go f.pollingForTiDB()
	go f.tidbProxy.run()
	go f.tidbStatusProxy.run()
	return nil
}

func (f *Forwarder) Close() {
	f.tidbProxy.stop()
	f.tidbStatusProxy.stop()
	close(f.donec)
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

func (f *Forwarder) createProxy() (*proxy, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, err
	}
	// TODO: config timeout?
	proxy := newProxy(l, nil, f.config.CheckInterval, 0)
	return proxy, nil
}

func (f *Forwarder) pollingForTiDB() {
	for {
		select {
		case <-time.After(f.pollInterval):
			var allTiDB []*tidbServerInfo
			var err error
			bo := backoff.NewExponentialBackOff()
			// setting a reasonable interval to avoid probing a living service for too long each round
			bo.MaxInterval = 5 * time.Second
			err = backoff.Retry(func() error {
				allTiDB, err = f.getServerInfo()
				if err != nil {
					log.Warn("Fail to get TiDB server info from PD", zap.Error(err))
				}
				return err
			}, bo)
			if err != nil {
				if errorx.IsOfType(err, ErrNoAliveTiDB) {
					log.Warn("no TiDB is alive now")
					f.tidbProxy.updateRemotes(nil)
					f.tidbStatusProxy.updateRemotes(nil)
				}
				continue
			}
			statusEndpoints := make(map[string]string)
			tidbEndpoints := make(map[string]string)
			for _, server := range allTiDB {
				statusEndpoints[server.IP] = fmt.Sprintf("%s:%d", server.IP, server.StatusPort)
				tidbEndpoints[server.IP] = fmt.Sprintf("%s:%d", server.IP, server.Port)
			}
			f.tidbProxy.updateRemotes(tidbEndpoints)
			f.tidbStatusProxy.updateRemotes(statusEndpoints)
		case <-f.donec:
			return
		}
	}
}

func NewForwarder(lc fx.Lifecycle, config *ForwarderConfig, etcdClient *clientv3.Client) *Forwarder {
	f := &Forwarder{
		etcdClient:   etcdClient,
		config:       config,
		ctx:          context.Background(),
		donec:        make(chan struct{}),
		pollInterval: 5 * time.Second, // TODO: add this into config?
	}

	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			return f.Open()
		},
		OnStop: func(context.Context) error {
			f.Close()
			return nil
		},
	})

	return f
}
