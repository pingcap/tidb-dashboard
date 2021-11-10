// Copyright 2021 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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

// Func cache input `fn`'s result by key
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
