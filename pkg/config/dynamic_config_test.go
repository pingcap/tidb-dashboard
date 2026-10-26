// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package config

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestKeyVisualPolicyValidationAndLegacyAdjustment(t *testing.T) {
	for _, disabled := range []bool{false, true} {
		for _, policy := range []string{KeyVisualDBPolicy, KeyVisualKVPolicy, "", "invalid-policy"} {
			t.Run(fmt.Sprintf("disabled=%t/policy=%q", disabled, policy), func(t *testing.T) {
				dc := &DynamicConfig{KeyVisual: KeyVisualConfig{
					AutoCollectionDisabled: disabled, Policy: policy, PolicyKVSeparator: "/",
				}}
				valid := policy == KeyVisualDBPolicy || policy == KeyVisualKVPolicy
				if valid {
					require.NoError(t, dc.Validate())
				} else {
					require.Error(t, dc.Validate(), "disabled collection must not bypass policy validation")
				}
				dc.Adjust()
				require.NoError(t, dc.Validate())
				if valid {
					require.Equal(t, policy, dc.KeyVisual.Policy)
				} else {
					require.Equal(t, DefaultKeyVisualPolicy, dc.KeyVisual.Policy)
				}
				require.Equal(t, disabled, dc.KeyVisual.AutoCollectionDisabled)
				require.Equal(t, "/", dc.KeyVisual.PolicyKVSeparator)
			})
		}
	}
}
