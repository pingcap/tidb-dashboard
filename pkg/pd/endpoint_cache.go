// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package pd

import (
	"time"

	"github.com/ReneKroon/ttlcache/v2"
	"github.com/pingcap/log"
	"go.uber.org/zap"
)

type EndpointCache struct {
	*ttlcache.Cache
}

func NewEndpointCache() *EndpointCache {
	cache := ttlcache.NewCache()
	cache.SkipTTLExtensionOnHit(true)
	return &EndpointCache{Cache: cache}
}

// Func cache input `fn`'s result by key.
func (c *EndpointCache) Func(key string, fn func() (map[string]struct{}, error), ttl time.Duration) (map[string]struct{}, error) {
	cacheItem, _ := c.Get(key)
	if cacheItem != nil {
		return cacheItem.(map[string]struct{}), nil
	}

	data, err := fn()
	if err != nil {
		return nil, err
	}

	err = c.SetWithTTL(key, data, ttl)
	// Set cache failure is acceptable
	if err != nil {
		log.Warn("Http client func cache failed", zap.Error(err))
	}

	return data, nil
}
