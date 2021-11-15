// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package feature

import (
	"testing"

	"github.com/stretchr/testify/require"
)

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
		ff := NewFlag("testFeature", tt.args.constraints)
		require.Equal(t, tt.want, ff.IsSupported(tt.args.target))
	}
}

func Test_Register_toManager(t *testing.T) {
	f1 := NewFlag("testFeature", []string{">= 5.3.0"})
	f2 := injectManager(f1.Register())
	require.Equal(t, f1, f2)
}

func injectManager(rf func(m *Manager)) *Flag {
	m := NewManager("v5.3.0")
	rf(m)
	return m.flags[0]
}
