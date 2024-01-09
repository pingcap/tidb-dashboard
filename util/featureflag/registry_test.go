// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package featureflag

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func Test_Register(t *testing.T) {
	m := NewRegistry("v5.3.0")
	tests := []*struct {
		supported   bool
		name        string
		constraints []string
		flag        *FeatureFlag
	}{
		{supported: true, name: "testFeature1", constraints: []string{">= 5.3.0"}},
		{supported: true, name: "testFeature2", constraints: []string{">= 4.0.0"}},
		{supported: false, name: "testFeature3", constraints: []string{">= 5.3.1"}},
	}

	for _, tt := range tests {
		tt.flag = m.Register(tt.name, tt.constraints...)
	}

	for _, tt := range tests {
		// check whether flag is in flags & supportedFeatures
		require.Equal(t, m.flags[tt.flag.name], tt.flag)
		_, ok := m.supportedFeatures[tt.flag.name]
		require.Equal(t, tt.supported, ok)
	}

	// duplicated register
	f := m.Register("testFeature3", ">= 5.3.2")
	require.Equal(t, f.name, "testFeature3")
	require.Equal(t, f.constraints[0], ">= 5.3.1")
}

func Test_SupportedFeatures(t *testing.T) {
	m := NewRegistry("v5.3.0")
	tests := []*struct {
		supported   bool
		name        string
		constraints []string
	}{
		{supported: true, name: "testFeature1", constraints: []string{">= 5.3.0"}},
		{supported: true, name: "testFeature2", constraints: []string{">= 4.0.0"}},
		{supported: false, name: "testFeature3", constraints: []string{">= 5.3.1"}},
	}

	for _, tt := range tests {
		m.Register(tt.name, tt.constraints...)
	}

	require.Equal(t, []string{"testFeature1", "testFeature2"}, m.SupportedFeatures())
}
