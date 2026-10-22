// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package config

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.etcd.io/etcd/api/v3/mvccpb"
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

func (kv *configTestKV) Get(_ context.Context, _ string, _ ...clientv3.OpOption) (*clientv3.GetResponse, error) {
	kv.mu.Lock()
	defer kv.mu.Unlock()
	if kv.value == "" {
		return &clientv3.GetResponse{}, nil
	}
	return &clientv3.GetResponse{Kvs: []*mvccpb.KeyValue{{Value: []byte(kv.value)}}}, nil
}

func TestConcurrentProfilingUpdatePreservesSSORevision(t *testing.T) {
	kv := &configTestKV{}
	m := &DynamicConfigManager{
		lifecycleCtx: context.Background(),
		etcdClient:   &clientv3.Client{KV: kv},
		dynamicConfig: &DynamicConfig{
			KeyVisual: KeyVisualConfig{AutoCollectionDisabled: true, Policy: DefaultKeyVisualPolicy},
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

func TestConfigWritesRejectInvalidKeyVisualPolicy(t *testing.T) {
	for _, method := range []string{"Set", "Modify"} {
		for _, disabled := range []bool{false, true} {
			for _, policy := range []string{"", "invalid-policy"} {
				t.Run(fmt.Sprintf("%s/disabled=%t/policy=%q", method, disabled, policy), func(t *testing.T) {
					kv := &configTestKV{}
					m := &DynamicConfigManager{lifecycleCtx: context.Background(), etcdClient: &clientv3.Client{KV: kv}}
					original := &DynamicConfig{KeyVisual: KeyVisualConfig{Policy: DefaultKeyVisualPolicy}}
					require.NoError(t, m.Set(original))
					updates := m.NewPushChannel()
					<-updates
					before := kv.value
					invalid := original.Clone()
					invalid.KeyVisual = KeyVisualConfig{AutoCollectionDisabled: disabled, Policy: policy}
					var err error
					if method == "Set" {
						err = m.Set(invalid)
					} else {
						err = m.Modify(func(dc *DynamicConfig) { dc.KeyVisual = invalid.KeyVisual })
					}
					require.Error(t, err)
					require.Equal(t, before, kv.value, "rejected settings must not reach etcd")
					current, err := m.Get()
					require.NoError(t, err)
					require.Equal(t, original.Clone(), current)
					select {
					case <-updates:
						t.Fatal("rejected settings were published to the service")
					default:
					}
					// Normal configuration changes must still be persisted and published.
					require.NoError(t, m.Modify(func(dc *DynamicConfig) {
						dc.KeyVisual = KeyVisualConfig{AutoCollectionDisabled: true, Policy: KeyVisualKVPolicy, PolicyKVSeparator: "/"}
					}))
					require.Equal(t, KeyVisualKVPolicy, (<-updates).KeyVisual.Policy)
				})
			}
		}
	}
}

func TestStartupRepairsLegacyKeyVisualPolicyBeforePublication(t *testing.T) {
	for _, tc := range []struct {
		name              string
		policy            string
		disabled, enabled bool
		wantPolicy        string
	}{
		{"disabled invalid policy", "invalid-policy", true, true, DefaultKeyVisualPolicy},
		{"enabled invalid policy", "invalid-policy", false, true, DefaultKeyVisualPolicy},
		{"legacy missing policy", "", true, true, DefaultKeyVisualPolicy},
		{"key visualizer stays disabled", "invalid-policy", true, false, DefaultKeyVisualPolicy},
		{"existing db policy", KeyVisualDBPolicy, true, true, KeyVisualDBPolicy},
		{"existing kv policy", KeyVisualKVPolicy, true, true, KeyVisualKVPolicy},
	} {
		t.Run(tc.name, func(t *testing.T) {
			legacy := &DynamicConfig{
				KeyVisual: KeyVisualConfig{AutoCollectionDisabled: tc.disabled, Policy: tc.policy, PolicyKVSeparator: "/"},
				SSO:       SSOConfig{Revision: "unchanged-sso-revision"},
			}
			encoded, err := json.Marshal(legacy)
			require.NoError(t, err)
			kv := &configTestKV{value: string(encoded)}
			for restart := 0; restart < 2; restart++ {
				m := &DynamicConfigManager{
					config: &Config{EnableKeyVisualizer: tc.enabled}, etcdClient: &clientv3.Client{KV: kv},
				}
				updates := m.NewPushChannel()
				ctx, cancel := context.WithCancel(context.Background())
				require.NoError(t, m.Start(ctx))
				var loaded *DynamicConfig
				select {
				case loaded = <-updates:
				case <-time.After(5 * time.Second):
					cancel()
					t.Fatal("startup did not publish a repaired config")
				}
				cancel()
				require.NoError(t, m.Stop(context.Background()))
				require.NoError(t, loaded.Validate())
				require.Equal(t, tc.wantPolicy, loaded.KeyVisual.Policy)
				require.Equal(t, !tc.enabled, loaded.KeyVisual.AutoCollectionDisabled)
				require.Equal(t, "/", loaded.KeyVisual.PolicyKVSeparator)
				require.Equal(t, "unchanged-sso-revision", loaded.SSO.Revision)
				kv.mu.Lock()
				var persisted DynamicConfig
				err := json.Unmarshal([]byte(kv.value), &persisted)
				kv.mu.Unlock()
				require.NoError(t, err)
				require.Equal(t, loaded, persisted.Clone())
			}
		})
	}
}
