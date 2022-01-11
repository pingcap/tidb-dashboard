// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package config

const (
	KeyVisualDBPolicy = "db"
	KeyVisualKVPolicy = "kv"

	DefaultKeyVisualPolicy = KeyVisualDBPolicy
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

type SSOCoreConfig struct {
	Enabled      bool   `json:"enabled"`
	ClientID     string `json:"client_id"`
	DiscoveryURL string `json:"discovery_url"`
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
	SSO       SSOConfig       `json:"sso"`
}

func (c *DynamicConfig) Clone() *DynamicConfig {
	newCfg := *c
	return &newCfg
}

func (c *DynamicConfig) Validate() error {
	if !c.KeyVisual.AutoCollectionDisabled {
		if err := c.KeyVisual.validatePolicy(); err != nil {
			return err
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
}
