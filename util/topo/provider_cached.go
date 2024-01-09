// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"context"
	"runtime"
	"time"

	"github.com/ReneKroon/ttlcache/v2"
)

// CachedTopology provides topology over an underlying topology provider with a TTL cache.
// This struct is concurrent-safe.
type CachedTopology struct {
	p     TopologyProvider
	cache *ttlcache.Cache
}

var _ TopologyProvider = (*CachedTopology)(nil)

func NewCachedTopology(p TopologyProvider, ttl time.Duration) TopologyProvider {
	cache := ttlcache.NewCache()
	cache.SkipTTLExtensionOnHit(true)
	_ = cache.SetTTL(ttl)

	ct := &CachedTopology{
		p:     p,
		cache: cache,
	}
	// Destroy the internal cache goroutine when no one is referencing this struct anymore.
	runtime.SetFinalizer(ct, (*CachedTopology).finalize)
	return ct
}

func (c *CachedTopology) getOrFillCache(key string, backSource func() (interface{}, error)) (interface{}, error) {
	if data, err := c.cache.Get(key); err == nil {
		return data, nil
	}
	// TODO: use singleflight.
	src, err := backSource()
	if err != nil {
		// Error is never cached.
		return nil, err
	}
	_ = c.cache.Set(key, src)
	runtime.KeepAlive(c)
	return src, nil
}

func (c *CachedTopology) GetPD(ctx context.Context) ([]PDInfo, error) {
	v, err := c.getOrFillCache("pd", func() (interface{}, error) {
		return c.p.GetPD(ctx)
	})
	if err != nil {
		return nil, err
	}
	return v.([]PDInfo), nil
}

func (c *CachedTopology) GetTiDB(ctx context.Context) ([]TiDBInfo, error) {
	v, err := c.getOrFillCache("tidb", func() (interface{}, error) {
		return c.p.GetTiDB(ctx)
	})
	if err != nil {
		return nil, err
	}
	return v.([]TiDBInfo), nil
}

func (c *CachedTopology) GetTiKV(ctx context.Context) ([]TiKVStoreInfo, error) {
	v, err := c.getOrFillCache("tikv", func() (interface{}, error) {
		return c.p.GetTiKV(ctx)
	})
	if err != nil {
		return nil, err
	}
	return v.([]TiKVStoreInfo), nil
}

func (c *CachedTopology) GetTiFlash(ctx context.Context) ([]TiFlashStoreInfo, error) {
	v, err := c.getOrFillCache("tiflash", func() (interface{}, error) {
		return c.p.GetTiFlash(ctx)
	})
	if err != nil {
		return nil, err
	}
	return v.([]TiFlashStoreInfo), nil
}

func (c *CachedTopology) GetPrometheus(ctx context.Context) (*PrometheusInfo, error) {
	v, err := c.getOrFillCache("prometheus", func() (interface{}, error) {
		return c.p.GetPrometheus(ctx)
	})
	if err != nil {
		return nil, err
	}
	return v.(*PrometheusInfo), nil
}

func (c *CachedTopology) GetGrafana(ctx context.Context) (*GrafanaInfo, error) {
	v, err := c.getOrFillCache("grafana", func() (interface{}, error) {
		return c.p.GetGrafana(ctx)
	})
	if err != nil {
		return nil, err
	}
	return v.(*GrafanaInfo), nil
}

func (c *CachedTopology) GetAlertManager(ctx context.Context) (*AlertManagerInfo, error) {
	v, err := c.getOrFillCache("alert_manager", func() (interface{}, error) {
		return c.p.GetAlertManager(ctx)
	})
	if err != nil {
		return nil, err
	}
	return v.(*AlertManagerInfo), nil
}

func (c *CachedTopology) finalize() {
	_ = c.cache.Close()
}
