// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestCachedTopologyCacheValue(t *testing.T) {
	type mockKey string

	const mockKey1 = mockKey("useMock1")
	const mockKey2 = mockKey("useMock2")

	mp := new(MockTopologyProvider)
	mp.
		On("GetPrometheus", mock.MatchedBy(func(ctx context.Context) bool {
			ctxV := ctx.Value(mockKey1)
			return ctxV != nil && ctxV.(bool) == true
		})).
		Return(&PrometheusInfo{
			IP:   "192.168.35.10",
			Port: 1234,
		}, nil).
		On("GetPrometheus", mock.MatchedBy(func(ctx context.Context) bool {
			ctxV := ctx.Value(mockKey2)
			return ctxV != nil && ctxV.(bool) == true
		})).
		Return(&PrometheusInfo{
			IP:   "192.168.100.5",
			Port: 5414,
		}, nil).
		On("GetPrometheus", mock.Anything).
		Return((*PrometheusInfo)(nil), fmt.Errorf("some error"))

	cp := NewCachedTopology(mp, time.Millisecond*500)

	// Error response should not be cached
	v, err := cp.GetPrometheus(context.Background())
	require.Error(t, err)
	require.Equal(t, err.Error(), "some error")
	require.Nil(t, v)
	mp.AssertNumberOfCalls(t, "GetPrometheus", 1)

	v, err = cp.GetPrometheus(context.Background())
	require.Error(t, err)
	require.Equal(t, err.Error(), "some error")
	require.Nil(t, v)
	mp.AssertNumberOfCalls(t, "GetPrometheus", 2)

	// Non error response should be cached
	v, err = cp.GetPrometheus(context.WithValue(context.Background(), mockKey1, true))
	require.NoError(t, err)
	require.Equal(t, "192.168.35.10", v.IP)
	require.Equal(t, uint(1234), v.Port)
	mp.AssertNumberOfCalls(t, "GetPrometheus", 3)

	v, err = cp.GetPrometheus(context.WithValue(context.Background(), mockKey1, true))
	require.NoError(t, err)
	require.Equal(t, "192.168.35.10", v.IP)
	require.Equal(t, uint(1234), v.Port)
	mp.AssertNumberOfCalls(t, "GetPrometheus", 3)

	v, err = cp.GetPrometheus(context.WithValue(context.Background(), mockKey2, true))
	require.NoError(t, err)
	require.Equal(t, "192.168.35.10", v.IP) // Unchanged since it is cached
	require.Equal(t, uint(1234), v.Port)
	mp.AssertNumberOfCalls(t, "GetPrometheus", 3)

	// Wait until expired
	time.Sleep(time.Millisecond * 550)
	v, err = cp.GetPrometheus(context.WithValue(context.Background(), mockKey2, true))
	require.NoError(t, err)
	require.Equal(t, "192.168.100.5", v.IP)
	require.Equal(t, uint(5414), v.Port)
	mp.AssertNumberOfCalls(t, "GetPrometheus", 4)

	v, err = cp.GetPrometheus(context.Background())
	require.NoError(t, err)
	require.Equal(t, "192.168.100.5", v.IP)
	require.Equal(t, uint(5414), v.Port)
	mp.AssertNumberOfCalls(t, "GetPrometheus", 4)

	// Wait until expired
	time.Sleep(time.Millisecond * 550)
	v, err = cp.GetPrometheus(context.Background())
	require.Error(t, err)
	require.Equal(t, err.Error(), "some error")
	require.Nil(t, v)
	mp.AssertNumberOfCalls(t, "GetPrometheus", 5)

	v, err = cp.GetPrometheus(context.Background())
	require.Error(t, err)
	require.Equal(t, err.Error(), "some error")
	require.Nil(t, v)
	mp.AssertNumberOfCalls(t, "GetPrometheus", 6)

	v, err = cp.GetPrometheus(context.WithValue(context.Background(), mockKey1, true))
	require.NoError(t, err)
	require.Equal(t, "192.168.35.10", v.IP)
	require.Equal(t, uint(1234), v.Port)
	mp.AssertNumberOfCalls(t, "GetPrometheus", 7)

	v, err = cp.GetPrometheus(context.Background())
	require.NoError(t, err)
	require.Equal(t, "192.168.35.10", v.IP)
	require.Equal(t, uint(1234), v.Port)
	mp.AssertNumberOfCalls(t, "GetPrometheus", 7)

	// Read should not extend TTL
	time.Sleep(time.Millisecond * 550)
	tBegin := time.Now()
	v, err = cp.GetPrometheus(context.WithValue(context.Background(), mockKey1, true))
	require.NoError(t, err)
	require.Equal(t, "192.168.35.10", v.IP)
	require.Equal(t, uint(1234), v.Port)
	mp.AssertNumberOfCalls(t, "GetPrometheus", 8)

	time.Sleep(time.Millisecond * 400)
	v, err = cp.GetPrometheus(context.Background())
	require.NoError(t, err)
	require.Equal(t, "192.168.35.10", v.IP)
	require.Equal(t, uint(1234), v.Port)
	mp.AssertNumberOfCalls(t, "GetPrometheus", 8)

	time.Sleep(time.Millisecond * 150) // 550ms has passed since first put, so we should expect cache to expire
	v, err = cp.GetPrometheus(context.Background())
	require.Error(t, err)
	require.Equal(t, err.Error(), "some error")
	require.Nil(t, v)
	mp.AssertNumberOfCalls(t, "GetPrometheus", 9)

	// Let's see that the expiration is not caused by 400ms+500ms.
	require.True(t, tBegin.Add(time.Millisecond*800).After(time.Now()))

	mp.AssertExpectations(t)
}

func TestCachedTopologyCacheNil(t *testing.T) {
	// No prometheus exists.
	mp := new(MockTopologyProvider)
	mp.
		On("GetPrometheus", mock.Anything).
		Return((*PrometheusInfo)(nil), nil)

	cp := NewCachedTopology(mp, time.Millisecond*500)

	v, err := cp.GetPrometheus(context.Background())
	require.NoError(t, err)
	require.Nil(t, v)
	mp.AssertNumberOfCalls(t, "GetPrometheus", 1)

	// Nil (but success) result is cached.
	v, err = cp.GetPrometheus(context.Background())
	require.NoError(t, err)
	require.Nil(t, v)
	mp.AssertNumberOfCalls(t, "GetPrometheus", 1)

	mp.AssertExpectations(t)
}

func TestCachedTopologyConcurrentGet(t *testing.T) {
	mp := new(MockTopologyProvider)
	mp.
		On("GetPrometheus", mock.Anything).
		After(time.Second).
		Return((*PrometheusInfo)(nil), nil)

	cp := NewCachedTopology(mp, time.Millisecond*500)

	var wg sync.WaitGroup
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			v, err := cp.GetPrometheus(context.Background())
			require.NoError(t, err)
			require.Nil(t, v)
		}()
	}
	wg.Wait()

	// There is no singleflight behavior.
	mp.AssertNumberOfCalls(t, "GetPrometheus", 5)

	v, err := cp.GetPrometheus(context.Background())
	require.NoError(t, err)
	require.Nil(t, v)

	mp.AssertNumberOfCalls(t, "GetPrometheus", 5)

	mp.AssertExpectations(t)
}

func TestCachedTopologyAllMethods(t *testing.T) {
	// Hopefully we can find cache key is not mixed via this test.
	mp := new(MockTopologyProvider)
	mp.
		On("GetPD", mock.Anything).Return([]PDInfo{{IP: "addr-pd.internal"}}, nil).
		On("GetTiDB", mock.Anything).Return([]TiDBInfo{{IP: "addr-tidb-2.internal"}, {IP: "addr-tidb-1.internal"}}, nil).
		On("GetTiKV", mock.Anything).Return([]TiKVStoreInfo{{IP: "addr-tikv-3.internal"}}, nil).
		On("GetTiFlash", mock.Anything).Return([]TiFlashStoreInfo{}, nil).
		On("GetPrometheus", mock.Anything).Return(nil, nil).
		On("GetGrafana", mock.Anything).Return(&GrafanaInfo{IP: "addr-grafana.internal"}, nil).
		On("GetAlertManager", mock.Anything).Return(&AlertManagerInfo{IP: "addr-am-x.internal"}, nil)

	cp := NewCachedTopology(mp, time.Millisecond*500)
	{
		v, err := cp.GetPD(context.Background())
		require.NoError(t, err)
		require.NotNil(t, v)
		require.Equal(t, 1, len(v))
		require.Equal(t, "addr-pd.internal", v[0].IP)
	}
	{
		v, err := cp.GetTiDB(context.Background())
		require.NoError(t, err)
		require.NotNil(t, v)
		require.Equal(t, 2, len(v))
		require.Equal(t, "addr-tidb-2.internal", v[0].IP)
		require.Equal(t, "addr-tidb-1.internal", v[1].IP)
	}
	{
		v, err := cp.GetTiKV(context.Background())
		require.NoError(t, err)
		require.NotNil(t, v)
		require.Equal(t, 1, len(v))
		require.Equal(t, "addr-tikv-3.internal", v[0].IP)
	}
	{
		v, err := cp.GetTiFlash(context.Background())
		require.NoError(t, err)
		require.NotNil(t, v)
		require.Equal(t, 0, len(v))
	}
	{
		v, err := cp.GetPrometheus(context.Background())
		require.NoError(t, err)
		require.Nil(t, v)
	}
	{
		v, err := cp.GetGrafana(context.Background())
		require.NoError(t, err)
		require.NotNil(t, v)
		require.Equal(t, "addr-grafana.internal", v.IP)
	}
	{
		v, err := cp.GetAlertManager(context.Background())
		require.NoError(t, err)
		require.NotNil(t, v)
		require.Equal(t, "addr-am-x.internal", v.IP)
	}

	mp.AssertExpectations(t)
}
