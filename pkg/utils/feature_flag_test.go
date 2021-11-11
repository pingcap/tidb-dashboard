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

package utils

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/pkg/utils/version"
)

func Test_IsSupport(t *testing.T) {
	ff := NewFeatureFlag("testFeature", []string{">= 5.3.0"})

	require.Equal(t, false, ff.IsSupport("v5.2.2"))
	// The results do not change because of caching. This is expected.
	require.Equal(t, false, ff.IsSupport("v5.3.0"))

	ff2 := NewFeatureFlag("testFeature", []string{">= 5.3.0"})
	require.Equal(t, true, ff2.IsSupport("v5.3.0"))

	ff3 := NewFeatureFlag("testFeature", []string{">= 5.3.0"})
	require.Equal(t, true, ff3.IsSupport("v5.3.2"))
}

func Test_isVersionSupport(t *testing.T) {
	type Args struct {
		target    string
		supported []string
	}
	tests := []struct {
		want bool
		args Args
	}{
		{want: false, args: Args{target: "v4.2.0", supported: []string{">= 5.3.0"}}},
		{want: false, args: Args{target: "v5.2.0", supported: []string{">= 5.3.0"}}},
		{want: true, args: Args{target: "v5.3.0", supported: []string{">= 5.3.0"}}},
		{want: false, args: Args{target: "v5.2.0-alpha-xxx", supported: []string{">= 5.3.0"}}},
		{want: true, args: Args{target: "v5.3.0-alpha-xxx", supported: []string{">= 5.3.0"}}},
		{want: true, args: Args{target: "v5.3.0", supported: []string{"= 5.3.0"}}},
		{want: false, args: Args{target: "v5.3.1", supported: []string{"= 5.3.0"}}},
	}

	for _, tt := range tests {
		isVersionSupport(tt.args.target, tt.args.supported)
	}

	version.Standalone = "No"
	version.PDVersion = "v5.3.0"
	require.Equal(t, true, isVersionSupport("v100.0.0", []string{"= 5.3.0"}))
}
