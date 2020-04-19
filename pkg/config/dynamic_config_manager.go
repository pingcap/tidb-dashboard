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

package config

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"
	"go.uber.org/zap"
)

const (
	DynamicConfigPath = "/dashboard/dynamic_config"
)

var (
	ErrorNS         = errorx.NewNamespace("error.dynamic_config")
	ErrUnableToLoad = ErrorNS.NewType("unable_to_load")
)

type DynamicConfigOption func(cfg *DynamicConfig)

type DynamicConfigManager struct {
	mu sync.RWMutex

	ctx        context.Context
	config     *Config
	etcdClient *clientv3.Client

	dynamicConfig *DynamicConfig
	pushChannels  []chan DynamicConfig
}

func NewDynamicConfigManager(lc fx.Lifecycle, config *Config, etcdClient *clientv3.Client) *DynamicConfigManager {
	dc := &DynamicConfigManager{
		config:     config,
		etcdClient: etcdClient,
	}
	lc.Append(fx.Hook{
		OnStart: dc.Start,
		OnStop:  dc.Stop,
	})
	return dc
}

func (dc *DynamicConfigManager) Start(ctx context.Context) error {
	dc.mu.Lock()
	defer dc.mu.Unlock()
	dc.ctx = ctx
	if err := dc.load(); err != nil {
		return nil
	}
	dc.dynamicConfig.Adjust()
	return dc.store()
}

func (dc *DynamicConfigManager) Stop(ctx context.Context) error {
	dc.mu.Lock()
	defer dc.mu.Unlock()
	for _, ch := range dc.pushChannels {
		close(ch)
	}
	return nil
}

func (dc *DynamicConfigManager) NewPushChannel() <-chan DynamicConfig {
	dc.mu.Lock()
	defer dc.mu.Unlock()
	ch := make(chan DynamicConfig, 100)
	dc.pushChannels = append(dc.pushChannels, ch)
	return ch
}

func (dc *DynamicConfigManager) Get() DynamicConfig {
	dc.mu.RLock()
	defer dc.mu.RUnlock()
	return *dc.dynamicConfig
}

func (dc *DynamicConfigManager) Set(opts ...DynamicConfigOption) error {
	dc.mu.Lock()
	defer dc.mu.Unlock()
	for _, opt := range opts {
		opt(dc.dynamicConfig)
	}
	return dc.store()
}

func (dc *DynamicConfigManager) load() error {
	resp, err := dc.etcdClient.Get(dc.ctx, DynamicConfigPath)
	if err != nil {
		return err
	}

	dc.dynamicConfig = &DynamicConfig{}
	switch len(resp.Kvs) {
	case 0:
		log.Warn("Dynamic config does not exist in etcd")
		return nil
	case 1:
		log.Info("Load dynamic config from etcd", zap.ByteString("json", resp.Kvs[0].Value))
		return json.Unmarshal(resp.Kvs[0].Value, dc.dynamicConfig)
	default:
		log.Error("unreachable")
		return ErrUnableToLoad.NewWithNoMessage()
	}
}

func (dc *DynamicConfigManager) store() error {
	bs, err := json.Marshal(dc.dynamicConfig)
	if err != nil {
		return err
	}
	log.Info("Save dynamic config to etcd", zap.ByteString("json", bs))
	_, err = dc.etcdClient.Put(dc.ctx, DynamicConfigPath, string(bs))
	return err
}
