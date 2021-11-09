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
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func Test_MakeFuncWithTTL(t *testing.T) {
	cache := NewCache()
	testData := &struct{ Text string }{
		Text: "test",
	}
	testFn := cache.MakeFuncWithTTL("test", func() (string, error) {
		return testData.Text, nil
	}, 1*time.Second).(func() (string, error))

	// test cache validity
	result, _ := testFn()
	require.Equal(t, "test", result)
	testData.Text = "test2"
	result2, _ := testFn()
	require.Equal(t, "test", result2)
	time.Sleep(1 * time.Second)
	result3, _ := testFn()
	require.Equal(t, "test2", result3)

	// test wrapped function with arg
	testFn2 := cache.MakeFuncWithTTL("test2", func(x string) (string, error) {
		return x, nil
	}, 1*time.Second).(func(t string) (string, error))
	result21, _ := testFn2("1")
	require.Equal(t, "1", result21)
	result22, _ := testFn2("2")
	require.Equal(t, "1", result22)
	time.Sleep(1 * time.Second)
	result23, _ := testFn2("3")
	require.Equal(t, "3", result23)

	// test type guard
	require.Panics(t, func() {
		_ = cache.MakeFuncWithTTL("test_panic", func() {
		}, 1*time.Second).(func())
	})
	require.Panics(t, func() {
		_ = cache.MakeFuncWithTTL("test_panic", func() string {
			return testData.Text
		}, 1*time.Second).(func() string)
	})
	require.Panics(t, func() {
		_ = cache.MakeFuncWithTTL("test_panic", func() (string, string) {
			return testData.Text, testData.Text
		}, 1*time.Second).(func() (string, string))
	})

	// test return error
	testFn3 := cache.MakeFuncWithTTL("test_error", func(isError bool) (string, error) {
		if isError {
			return "", fmt.Errorf("test error")
		}
		return "test", nil
	}, 1*time.Second).(func(isError bool) (string, error))
	_, err := testFn3(true)
	require.Error(t, err)
	result31, _ := testFn3(false)
	require.Equal(t, "test", result31)

	time.Sleep(1 * time.Second)
	_, _ = testFn3(true)
	result32, _ := testFn3(false)
	require.Equal(t, "test", result32)
	result33, _ := testFn3(true)
	require.Equal(t, "test", result33)
}
