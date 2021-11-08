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

package httpc

import (
	"fmt"
	"reflect"
	"time"

	"github.com/ReneKroon/ttlcache/v2"
	"github.com/pingcap/log"
	"go.uber.org/zap"
)

type Cache struct {
	*ttlcache.Cache
}

func NewCache() *Cache {
	cache := ttlcache.NewCache()
	cache.SkipTTLExtensionOnHit(true)
	return &Cache{Cache: cache}
}

// MakeFuncWithTTL returns a new function that will cache the result of input func.
// Only accept wrapped functions of type `func(args ...interface{}) (result interface{}, err error)`
func (c *Cache) MakeFuncWithTTL(key string, f interface{}, ttl time.Duration) interface{} {
	fn := reflect.ValueOf(f)
	fnType := reflect.TypeOf(f)

	// Type guard
	// Only accept wrapped functions of type `func(args ...interface{}) (result interface{}, err error)`
	if fnType.NumOut() != 2 || !fnType.Out(1).Implements(reflect.TypeOf((*error)(nil)).Elem()) {
		panic(fmt.Sprintf("MakeFuncWithTTL requires a function that second return arg is error type, type of func now: %v", fnType))
	}

	cacheWrap := func(in []reflect.Value) []reflect.Value {
		cacheData, _ := c.Get(key)
		if cacheData != nil {
			return []reflect.Value{
				reflect.ValueOf(cacheData),
				reflect.Zero(reflect.TypeOf((*error)(nil)).Elem()),
			}
		}

		returns := fn.Call(in)
		returnData := returns[0]
		returnErr := returns[1]
		if !returnErr.IsNil() {
			return returns
		}

		err := c.SetWithTTL(key, returnData.Interface(), ttl)
		// Set cache failure is acceptable
		if err != nil {
			log.Warn("Http client func cache failed", zap.Error(err))
		}

		return returns
	}

	// Make function of the input function type
	newFn := reflect.MakeFunc(fn.Type(), cacheWrap)
	return newFn.Interface()
}
