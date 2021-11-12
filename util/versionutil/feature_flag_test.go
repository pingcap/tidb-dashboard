// Copyright 2021 Suhaha
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package versionutil

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
		ff := NewFeatureFlag("testFeature", tt.args.constraints)
		require.Equal(t, tt.want, ff.IsSupported(tt.args.target))
	}

	Standalone = "No"
	PDVersion = "v5.3.0"
	ff := NewFeatureFlag("testFeature", []string{"= 5.3.0"})
	require.Equal(t, true, ff.IsSupported("v100.0.0"))
}
