// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package config

import (
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

const (
	KeyVisualDBPolicy = "db"
	KeyVisualKVPolicy = "kv"

	DefaultKeyVisualPolicy = KeyVisualDBPolicy

	DefaultProfilingAutoCollectionDurationSecs = 30
	MaxProfilingAutoCollectionDurationSecs     = 120
	DefaultProfilingAutoCollectionIntervalSecs = 3600
)

var (
	KeyVisualPolicies = []string{KeyVisualDBPolicy, KeyVisualKVPolicy}

	ErrVerificationFailed = ErrorNS.NewType("verification failed")
)

type KeyVisualConfig struct {
	AutoCollectionDisabled bool   `json:"auto_collection_disabled"`
	Policy                 string `json:"policy"`
	PolicyKVSeparator      string `json:"policy_kv_separator"`
}

func (c *KeyVisualConfig) validatePolicy() error {
	for _, p := range KeyVisualPolicies {
		if p == c.Policy {
			return nil
		}
	}
	return ErrVerificationFailed.New("policy must be in %v", KeyVisualPolicies)
}

type ProfilingConfig struct {
	AutoCollectionTargets      []model.RequestTargetNode `json:"auto_collection_targets"`
	AutoCollectionDurationSecs uint                      `json:"auto_collection_duration_secs"`
	AutoCollectionIntervalSecs uint                      `json:"auto_collection_interval_secs"`
}

type SSOCoreConfig struct {
	Enabled      bool   `json:"enabled"`
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	DiscoveryURL string `json:"discovery_url"`
	Scopes       string `json:"scopes"`
	IsReadOnly   bool   `json:"is_read_only"`
}

type SSOConfig struct {
	CoreConfig  SSOCoreConfig `json:"core_config"`
	AuthURL     string        `json:"auth_url"`
	TokenURL    string        `json:"token_url"`
	UserInfoURL string        `json:"user_info_url"`
	SignOutURL  string        `json:"sign_out_url"`
}

type DynamicConfig struct {
	KeyVisual KeyVisualConfig `json:"keyvisual"`
	Profiling ProfilingConfig `json:"profiling"`
	SSO       SSOConfig       `json:"sso"`
}

func (c *DynamicConfig) Clone() *DynamicConfig {
	newCfg := *c
	newCfg.Profiling.AutoCollectionTargets = make([]model.RequestTargetNode, len(c.Profiling.AutoCollectionTargets))
	copy(newCfg.Profiling.AutoCollectionTargets, c.Profiling.AutoCollectionTargets)
	return &newCfg
}

func (c *DynamicConfig) Validate() error {
	if !c.KeyVisual.AutoCollectionDisabled {
		if err := c.KeyVisual.validatePolicy(); err != nil {
			return err
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
	if !c.KeyVisual.AutoCollectionDisabled {
		if err := c.KeyVisual.validatePolicy(); err != nil {
			c.KeyVisual.Policy = DefaultKeyVisualPolicy
		}
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
