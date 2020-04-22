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
	"github.com/cenkalti/backoff/v4"
	"github.com/joomcode/errorx"
	"net"
	"sync"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"
)

const (
	tidbProxyLabel   = "tidb"
	statusProxyLabel = "tidbStatus"
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
	ctx        context.Context
	config     *ForwarderConfig
	etcdClient *clientv3.Client
	// The key is str label and value is the proxy
	proxyManager sync.Map
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
	pr, err := f.createProxy(tidbProxyLabel, tidbEndpoints)
	if err != nil {
		return err
	}
	go pr.Run()
	f.tidbPort = pr.port()
	pr, err = f.createProxy(statusProxyLabel, statusEndpoints)
	if err != nil {
		return err
	}
	f.statusPort = pr.port()
	go pr.Run()
	go f.pollingForTiDB()
	return nil
}

func (f *Forwarder) Close() error {
	p := f.getProxy(tidbProxyLabel)
	if p != nil {
		p.Stop()
	}
	p = f.getProxy(statusProxyLabel)
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

func (f *Forwarder) createProxy(key string, endpoints map[string]string) (*Proxy, error) {
	if len(endpoints) == 0 {
		return nil, fmt.Errorf("empty endpoints")
	}
	port, err := getFreePort()
	if err != nil {
		return nil, err
	}
	l, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		return nil, err
	}
	proxy := NewProxy(l, endpoints, f.config.CheckInterval, 0)
	f.proxyManager.Store(key, proxy)
	return proxy, nil
}

func (f *Forwarder) getProxy(key string) *Proxy {
	v, ok := f.proxyManager.Load(key)
	if ok {
		return v.(*Proxy)
	}
	return nil
}

func (f *Forwarder) updateRemote(key string, newEndpoints map[string]string) {
	if p := f.getProxy(key); p != nil {
		if newEndpoints == nil {
			log.Debug("remove all remotes in proxy", zap.String("proxy", key))
		}
		p.updateRemotes(newEndpoints)
	}
}

func (f *Forwarder) pollingForTiDB() {
	for {
		select {
		case <-time.After(f.pollInterval):
			var allTiDB []*tidbServerInfo
			var err error
			backoff.Retry(func() error {
				allTiDB, err = f.getServerInfo()
				return err
			}, backoff.NewExponentialBackOff())
			if err != nil {
				if errorx.IsOfType(err, ErrNoAliveTiDB) {
					log.Warn("no TiDB is alive now")
					f.updateRemote(tidbProxyLabel, nil)
					f.updateRemote(statusProxyLabel, nil)
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
			f.updateRemote(tidbProxyLabel, tidbEndpoints)
			f.updateRemote(statusProxyLabel, statusEndpoints)
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
			return f.Close()
		},
	})

	return f
}

func getFreePort() (int, error) {
	addr, err := net.ResolveTCPAddr("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	l, err := net.ListenTCP("tcp", addr)
	if err != nil {
		return 0, err
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port, nil
}
