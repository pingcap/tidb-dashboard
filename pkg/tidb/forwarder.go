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
	"time"

	"github.com/go-sql-driver/mysql"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"

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
}

// TODO: Requires load balancing and health checks.
func (f *Forwarder) Open() error {
	// Currently this function does nothing.
	return nil
}

func (f *Forwarder) Close() error {
	// Currently this function does nothing.
	return nil
}

func (f *Forwarder) getServerInfo() (*tidbServerInfo, error) {
	ctx, cancel := context.WithTimeout(f.ctx, f.config.TiDBRetrieveTimeout)
	resp, err := f.etcdClient.Get(ctx, pd.TiDBServerInformationPath, clientv3.WithPrefix())
	cancel()

	if err != nil {
		return nil, ErrPDAccessFailed.New("access PD failed: %s", err)
	}

	var info tidbServerInfo
	for _, kv := range resp.Kvs {
		err = json.Unmarshal(kv.Value, &info)
		if err != nil {
			continue
		}
		return &info, nil
	}

	return nil, ErrNoAliveTiDB.New("no TiDB is alive")
}

func NewForwarder(lc fx.Lifecycle, config *ForwarderConfig, etcdClient *clientv3.Client) *Forwarder {
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
