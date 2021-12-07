// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package featureflag

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func Test_Name(t *testing.T) {
	f1 := &FeatureFlag{}
	require.Equal(t, f1.Name(), "")

	f2 := NewFeatureFlag("testFeature")
	require.Equal(t, f2.Name(), "testFeature")
}

func Test_IsSupported(t *testing.T) {
	type Args struct {
		target      string
		constraints []string
	}
	tests := []struct {
		want bool
		args Args
	}{
		{want: false, args: Args{target: "v4.2.0", constraints: []string{">= 5.3.0"}}},
		{want: false, args: Args{target: "v5.2.0", constraints: []string{">= 5.3.0"}}},
		{want: true, args: Args{target: "v5.3.0", constraints: []string{">= 5.3.0"}}},
		{want: false, args: Args{target: "v5.2.0-alpha-xxx", constraints: []string{">= 5.3.0"}}},
		{want: true, args: Args{target: "v5.3.0-alpha-xxx", constraints: []string{">= 5.3.0"}}},
		{want: true, args: Args{target: "v5.3.0", constraints: []string{"= 5.3.0"}}},
		{want: false, args: Args{target: "v5.3.1", constraints: []string{"= 5.3.0"}}},
	}

	for _, tt := range tests {
		ff := NewFeatureFlag("testFeature", tt.args.constraints...)
		require.Equal(t, tt.want, ff.IsSupported(tt.args.target))
	}
}
