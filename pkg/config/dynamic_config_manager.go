// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package config

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/fx"
	"go.uber.org/zap"
)

const (
	DynamicConfigPath = "/dashboard/dynamic_config"
	Timeout           = time.Second
	MaxCheckInterval  = 30 * time.Second
	MaxElapsedTime    = 0 // never stop if MaxElapsedTime == 0
)

var (
	ErrorNS         = errorx.NewNamespace("error.dynamic_config")
	ErrUnableToLoad = ErrorNS.NewType("unable_to_load")
	ErrNotReady     = ErrorNS.NewType("not_ready")
)

type DynamicConfigOption func(dc *DynamicConfig)

type DynamicConfigManager struct {
	mu sync.RWMutex

	lifecycleCtx context.Context
	config       *Config
	etcdClient   *clientv3.Client

	dynamicConfig *DynamicConfig
	pushChannels  []chan *DynamicConfig
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
	m.lifecycleCtx = ctx

	go func() {
		var dc *DynamicConfig
		ebo := backoff.NewExponentialBackOff()
		ebo.MaxInterval = MaxCheckInterval
		ebo.MaxElapsedTime = MaxElapsedTime
		bo := backoff.WithContext(ebo, ctx)

		if err := backoff.Retry(func() error {
			var err error
			dc, err = m.load()
			return err
		}, bo); err != nil {
			log.Error("Failed to start DynamicConfigManager", zap.Error(err))
			return
		}

		if dc == nil {
			dc = &DynamicConfig{}
		}
		dc.Adjust()
		dc.KeyVisual.AutoCollectionDisabled = !m.config.EnableKeyVisualizer

		if err := backoff.Retry(func() error { return m.Set(dc) }, bo); err != nil {
			log.Error("Failed to start DynamicConfigManager", zap.Error(err))
		}
	}()

	return nil
}

func (m *DynamicConfigManager) Stop(_ context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, ch := range m.pushChannels {
		close(ch)
	}
	return nil
}

func (m *DynamicConfigManager) NewPushChannel() <-chan *DynamicConfig {
	m.mu.Lock()
	defer m.mu.Unlock()

	ch := make(chan *DynamicConfig, 1000)
	m.pushChannels = append(m.pushChannels, ch)

	if m.dynamicConfig != nil {
		ch <- m.dynamicConfig.Clone()
	}

	return ch
}

func (m *DynamicConfigManager) Get() (*DynamicConfig, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if m.dynamicConfig == nil {
		return nil, ErrNotReady.NewWithNoMessage()
	}
	return m.dynamicConfig.Clone(), nil
}

func (m *DynamicConfigManager) Set(newDc *DynamicConfig) error {
	if err := m.store(newDc); err != nil {
		return err
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.dynamicConfig = newDc

	for _, ch := range m.pushChannels {
		ch <- m.dynamicConfig.Clone()
	}

	return nil
}

func (m *DynamicConfigManager) Modify(opts ...DynamicConfigOption) error {
	newDc, err := m.Get()
	if err != nil {
		return err
	}

	for _, opt := range opts {
		opt(newDc)
	}
	if err := newDc.Validate(); err != nil {
		return err
	}

	return m.Set(newDc)
}

func (m *DynamicConfigManager) load() (*DynamicConfig, error) {
	ctx, cancel := context.WithTimeout(m.lifecycleCtx, Timeout)
	defer cancel()
	resp, err := m.etcdClient.Get(ctx, DynamicConfigPath)
	if err != nil {
		log.Warn("Failed to load dynamic config from etcd", zap.Error(err))
		return nil, ErrUnableToLoad.WrapWithNoMessage(err)
	}
	switch len(resp.Kvs) {
	case 0:
		log.Warn("Dynamic config does not exist in etcd")
		return nil, nil
	case 1:
		// the log contains the sso client secret, so we should not log it
		// log.Info("Load dynamic config from etcd", zap.ByteString("json", resp.Kvs[0].Value))
		var dc DynamicConfig
		if err = json.Unmarshal(resp.Kvs[0].Value, &dc); err != nil {
			return nil, err
		}
		return &dc, nil
	default:
		log.Error("etcd is unreachable")
		return nil, backoff.Permanent(ErrUnableToLoad.New("unreachable"))
	}
}

func (m *DynamicConfigManager) store(dc *DynamicConfig) error {
	bs, err := json.Marshal(dc)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(m.lifecycleCtx, Timeout)
	defer cancel()
	_, err = m.etcdClient.Put(ctx, DynamicConfigPath, string(bs))
	// the log contains the sso client secret, so we should not log it
	// log.Info("Save dynamic config to etcd", zap.ByteString("json", bs))

	return err
}
