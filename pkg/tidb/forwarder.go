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
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/go-sql-driver/mysql"
	"github.com/joomcode/errorx"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/topology"
)

var (
	ErrPDAccessFailed = ErrNS.NewType("pd_access_failed")
	ErrNoAliveTiDB    = ErrNS.NewType("no_alive_tidb")
)

type ForwarderConfig struct {
	ClusterTLSConfig    *tls.Config
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
		ClusterTLSConfig:    cfg.ClusterTLSConfig,
		TiDBTLSConfig:       cfg.TiDBTLSConfig,
		TiDBRetrieveTimeout: time.Second,
		TiDBPollInterval:    5 * time.Second,
		ProxyTimeout:        3 * time.Second,
		ProxyCheckInterval:  2 * time.Second,
	}
}

type Forwarder struct {
	lifecycleCtx context.Context

	config     *ForwarderConfig
	etcdClient *clientv3.Client
	httpClient *http.Client
	uriScheme  string

	tidbProxy       *proxy
	tidbStatusProxy *proxy
	tidbPort        int
	statusPort      int
}

func (f *Forwarder) Start(ctx context.Context) error {
	f.lifecycleCtx = ctx

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
	bo := backoff.WithContext(ebo, f.lifecycleCtx)

	for {
		var allTiDB []topology.TiDBInfo
		err := backoff.Retry(func() error {
			var err error
			allTiDB, err = topology.FetchTiDBTopology(bo.Context(), f.etcdClient)
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
		case <-f.lifecycleCtx.Done():
			return
		case <-time.After(f.config.TiDBPollInterval):
		}
	}
}

func NewForwarder(lc fx.Lifecycle, config *ForwarderConfig, etcdClient *clientv3.Client, httpClient *http.Client) *Forwarder {
	f := &Forwarder{
		config:     config,
		etcdClient: etcdClient,
		httpClient: httpClient,
	}

	if config.ClusterTLSConfig == nil {
		f.uriScheme = "http"
	} else {
		f.uriScheme = "https"
	}

	lc.Append(fx.Hook{
		OnStart: f.Start,
	})

	return f
}
