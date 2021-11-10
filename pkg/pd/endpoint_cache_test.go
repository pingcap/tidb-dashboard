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
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func Test_Func_CacheValidity(t *testing.T) {
	cache := NewEndpointCache()
	testData := []map[string]struct{}{
		{"test": {}},
	}
	testFn := func(key string) (map[string]struct{}, error) {
		return cache.Func(key, func() (map[string]struct{}, error) {
			return testData[0], nil
		}, 1*time.Second)
	}

	result, _ := testFn("test_key")
	_, ok := result["test"]
	require.Equal(t, true, ok)

	testData[0] = map[string]struct{}{"test2": {}}
	result2, _ := testFn("test_key")
	_, testOk := result2["test"]
	_, test2Ok := result2["test2"]
	require.Equal(t, true, testOk)
	require.Equal(t, false, test2Ok)

	time.Sleep(1 * time.Second)
	result3, _ := testFn("test_key")
	_, test2Ok = result3["test2"]
	require.Equal(t, true, test2Ok)
}

func Test_Func_DiffCacheKey(t *testing.T) {
	cache := NewEndpointCache()
	testData := []map[string]struct{}{
		{"test": {}},
	}
	testFn := func(key string) (map[string]struct{}, error) {
		return cache.Func(key, func() (map[string]struct{}, error) {
			return testData[0], nil
		}, 1*time.Second)
	}

	result, _ := testFn("test_key")
	_, ok := result["test"]
	require.Equal(t, true, ok)

	testData[0] = map[string]struct{}{"test2": {}}
	result21, _ := testFn("test_key")
	result22, _ := testFn("test_key2")
	_, test21Ok := result21["test"]
	_, test22Ok := result22["test2"]
	require.Equal(t, true, test21Ok)
	require.Equal(t, true, test22Ok)
}
