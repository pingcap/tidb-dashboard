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

import "fmt"

const (
	KeyVisualDBPolicy = "db"
	KeyVisualKVPolicy = "kv"
)

var KeyVisualPolicies = []string{KeyVisualDBPolicy, KeyVisualKVPolicy}

const (
	DefaultKeyVisualPolicy            = KeyVisualDBPolicy
	DefaultKeyVisualPolicyKVSeparator = "/"
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

func (c *DynamicConfig) Clone() *DynamicConfig {
	newCfg := *c
	return &newCfg
}

type DynamicConfig struct {
	KeyVisual KeyVisualConfig `json:"keyvisual"`
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
}
