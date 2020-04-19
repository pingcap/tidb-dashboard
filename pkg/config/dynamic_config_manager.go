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

type DynamicConfigOption func(dc *DynamicConfig)

type DynamicConfigManager struct {
	mu sync.RWMutex

	ctx        context.Context
	config     *Config
	etcdClient *clientv3.Client

	dynamicConfig *DynamicConfig
	pushChannels  []chan DynamicConfig
}

func NewDynamicConfigManager(lc fx.Lifecycle, config *Config, etcdClient *clientv3.Client) *DynamicConfigManager {
	m := &DynamicConfigManager{
		config:     config,
		etcdClient: etcdClient,
	}
	lc.Append(fx.Hook{
		OnStart: m.Start,
		OnStop:  m.Stop,
	})
	return m
}

func (m *DynamicConfigManager) Start(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ctx = ctx
	if err := m.load(); err != nil {
		return nil
	}
	m.dynamicConfig.Adjust()
	return m.store()
}

func (m *DynamicConfigManager) Stop(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, ch := range m.pushChannels {
		close(ch)
	}
	return nil
}

func (m *DynamicConfigManager) NewPushChannel() <-chan DynamicConfig {
	m.mu.Lock()
	defer m.mu.Unlock()
	ch := make(chan DynamicConfig, 100)
	ch <- *m.dynamicConfig
	m.pushChannels = append(m.pushChannels, ch)
	return ch
}

func (m *DynamicConfigManager) Get() DynamicConfig {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return *m.dynamicConfig
}

func (m *DynamicConfigManager) Set(opts ...DynamicConfigOption) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, opt := range opts {
		opt(m.dynamicConfig)
	}
	if err := m.store(); err != nil {
		return err
	}
	for _, ch := range m.pushChannels {
		ch <- *m.dynamicConfig
	}
	return nil
}

func (m *DynamicConfigManager) load() error {
	resp, err := m.etcdClient.Get(m.ctx, DynamicConfigPath)
	if err != nil {
		return err
	}

	m.dynamicConfig = &DynamicConfig{}
	switch len(resp.Kvs) {
	case 0:
		log.Warn("Dynamic config does not exist in etcd")
		return nil
	case 1:
		log.Info("Load dynamic config from etcd", zap.ByteString("json", resp.Kvs[0].Value))
		return json.Unmarshal(resp.Kvs[0].Value, m.dynamicConfig)
	default:
		log.Error("unreachable")
		return ErrUnableToLoad.NewWithNoMessage()
	}
}

func (m *DynamicConfigManager) store() error {
	bs, err := json.Marshal(m.dynamicConfig)
	if err != nil {
		return err
	}
	log.Info("Save dynamic config to etcd", zap.ByteString("json", bs))
	_, err = m.etcdClient.Put(m.ctx, DynamicConfigPath, string(bs))
	return err
}
