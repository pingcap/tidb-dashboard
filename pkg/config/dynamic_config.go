// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package config

import (
	"fmt"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/model"
)

const (
	KeyVisualDBPolicy = "db"
	KeyVisualKVPolicy = "kv"
)

var KeyVisualPolicies = []string{KeyVisualDBPolicy, KeyVisualKVPolicy}

const (
	DefaultKeyVisualPolicy            = KeyVisualDBPolicy
	DefaultKeyVisualPolicyKVSeparator = "/"

	DefaultProfilingAutoCollectionDurationSecs = 30
	MaxProfilingAutoCollectionDurationSecs     = 120
	DefaultProfilingAutoCollectionIntervalSecs = 3600
)

var (
	ErrVerificationFailed = ErrorNS.NewType("verification failed")
)

func validateKeyVisualPolicy(policy string) bool {
	for _, p := range KeyVisualPolicies {
		if p == policy {
			return true
		}
	}
	return false
}

type KeyVisualConfig struct {
	AutoCollectionEnabled bool   `json:"auto_collection_enabled"`
	Policy                string `json:"policy"`
	PolicyKVSeparator     string `json:"policy_kv_separator"`
}

func NewDefaultKeyVisualConfig() *KeyVisualConfig {
	return &KeyVisualConfig{
		AutoCollectionEnabled: false,
		Policy:                DefaultKeyVisualPolicy,
		PolicyKVSeparator:     DefaultKeyVisualPolicyKVSeparator,
	}
}

type ProfilingConfig struct {
	AutoCollectionTargets      []model.RequestTargetNode `json:"auto_collection_targets"`
	AutoCollectionDurationSecs uint                      `json:"auto_collection_duration_secs"`
	AutoCollectionIntervalSecs uint                      `json:"auto_collection_interval_secs"`
}

type DynamicConfig struct {
	KeyVisual KeyVisualConfig `json:"keyvisual"`
	Profiling ProfilingConfig `json:"profiling"`
}

func (c *DynamicConfig) Clone() *DynamicConfig {
	newCfg := *c
	newCfg.Profiling.AutoCollectionTargets = make([]model.RequestTargetNode, len(c.Profiling.AutoCollectionTargets))
	copy(newCfg.Profiling.AutoCollectionTargets, c.Profiling.AutoCollectionTargets)
	return &newCfg
}

func (c *DynamicConfig) Validate() error {
	if c.KeyVisual.AutoCollectionEnabled {
		if !validateKeyVisualPolicy(c.KeyVisual.Policy) {
			return ErrVerificationFailed.New(fmt.Sprintf("policy must be in %v", KeyVisualPolicies))
		}
		if c.KeyVisual.PolicyKVSeparator == "" {
			return ErrVerificationFailed.New("policy_kv_separator cannot be empty")
		}
	}

	if len(c.Profiling.AutoCollectionTargets) > 0 {
		if c.Profiling.AutoCollectionDurationSecs == 0 {
			return ErrVerificationFailed.New("auto_collection_duration_secs cannot be 0")
		}
		if c.Profiling.AutoCollectionDurationSecs > MaxProfilingAutoCollectionDurationSecs {
			return ErrVerificationFailed.New("auto_collection_duration_secs cannot be greater than %d", MaxProfilingAutoCollectionDurationSecs)
		}
		if c.Profiling.AutoCollectionIntervalSecs == 0 {
			return ErrVerificationFailed.New("auto_collection_interval_secs cannot be 0")
		}
	} else {
		if c.Profiling.AutoCollectionDurationSecs != 0 {
			return ErrVerificationFailed.New("auto_collection_duration_secs must be 0")
		}
		if c.Profiling.AutoCollectionIntervalSecs != 0 {
			return ErrVerificationFailed.New("auto_collection_interval_secs must be 0")
		}
	}

	return nil
}

// Adjust is used to fill the default config for the existing config of the old version.
func (c *DynamicConfig) Adjust() {
	if !validateKeyVisualPolicy(c.KeyVisual.Policy) {
		c.KeyVisual.Policy = DefaultKeyVisualPolicy
	}
	if c.KeyVisual.Policy == KeyVisualKVPolicy && c.KeyVisual.PolicyKVSeparator == "" {
		c.KeyVisual.PolicyKVSeparator = DefaultKeyVisualPolicyKVSeparator
	}

	if len(c.Profiling.AutoCollectionTargets) > 0 {
		if c.Profiling.AutoCollectionDurationSecs == 0 {
			c.Profiling.AutoCollectionDurationSecs = DefaultProfilingAutoCollectionDurationSecs
		}
		if c.Profiling.AutoCollectionDurationSecs > MaxProfilingAutoCollectionDurationSecs {
			c.Profiling.AutoCollectionDurationSecs = MaxProfilingAutoCollectionDurationSecs
		}
		if c.Profiling.AutoCollectionIntervalSecs == 0 {
			c.Profiling.AutoCollectionIntervalSecs = DefaultProfilingAutoCollectionIntervalSecs
		}
	} else {
		c.Profiling.AutoCollectionDurationSecs = 0
		c.Profiling.AutoCollectionIntervalSecs = 0
	}
}
