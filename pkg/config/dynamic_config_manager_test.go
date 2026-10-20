// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package config

import (
	"context"
	"encoding/json"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	clientv3 "go.etcd.io/etcd/client/v3"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

type configTestKV struct {
	clientv3.KV
	mu    sync.Mutex
	value string
}

func (kv *configTestKV) Put(_ context.Context, _, value string, _ ...clientv3.OpOption) (*clientv3.PutResponse, error) {
	kv.mu.Lock()
	defer kv.mu.Unlock()
	kv.value = value
	return &clientv3.PutResponse{}, nil
}

func TestConcurrentProfilingUpdatePreservesSSORevision(t *testing.T) {
	kv := &configTestKV{}
	m := &DynamicConfigManager{
		lifecycleCtx: context.Background(),
		etcdClient:   &clientv3.Client{KV: kv},
		dynamicConfig: &DynamicConfig{
			KeyVisual: KeyVisualConfig{AutoCollectionDisabled: true},
			SSO:       SSOConfig{Revision: "R0"},
			Profiling: ProfilingConfig{
				AutoCollectionTargets:      []model.RequestTargetNode{{IP: "127.0.0.1", Port: 4000}},
				AutoCollectionDurationSecs: 30,
				AutoCollectionIntervalSecs: 3600,
			},
		},
	}
	profilingStarted, resumeProfiling := make(chan struct{}), make(chan struct{})
	var resumeOnce sync.Once
	release := func() { resumeOnce.Do(func() { close(resumeProfiling) }) }
	defer release()
	profilingDone := make(chan error, 1)
	go func() {
		profilingDone <- m.Modify(func(dc *DynamicConfig) {
			dc.Profiling.AutoCollectionDurationSecs = 60
			close(profilingStarted)
			<-resumeProfiling
		})
	}()
	select {
	case <-profilingStarted:
	case <-time.After(5 * time.Second):
		t.Fatal("profiling update did not start")
	}

	ssoStarted, ssoDone := make(chan struct{}), make(chan error, 1)
	go func() {
		ssoDone <- m.Modify(func(dc *DynamicConfig) {
			close(ssoStarted)
			dc.SSO.Revision = "R1"
		})
	}()
	// Without serialization, let SSO publish R1 before the delayed profiling
	// update publishes its R0 snapshot. Both updates must survive either order.
	ssoFinished := false
	select {
	case <-ssoStarted:
		require.NoError(t, <-ssoDone)
		ssoFinished = true
	case <-time.After(100 * time.Millisecond):
	}
	release()
	require.NoError(t, <-profilingDone)
	if !ssoFinished {
		require.NoError(t, <-ssoDone)
	}

	dc, err := m.Get()
	require.NoError(t, err)
	require.Equal(t, "R1", dc.SSO.Revision, "profiling must not restore an old SSO revision")
	require.EqualValues(t, 60, dc.Profiling.AutoCollectionDurationSecs)
	kv.mu.Lock()
	value := kv.value
	kv.mu.Unlock()
	var persisted DynamicConfig
	require.NoError(t, json.Unmarshal([]byte(value), &persisted))
	require.Equal(t, "R1", persisted.SSO.Revision)
	require.EqualValues(t, 60, persisted.Profiling.AutoCollectionDurationSecs)
}
