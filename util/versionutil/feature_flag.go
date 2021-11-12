// Copyright 2021 PingCAP, Inc.
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
	"strings"

	"github.com/Masterminds/semver"
)

type FeatureFlag struct {
	Name string

	constraints []string
}

func NewFeatureFlag(name string, constraints []string) *FeatureFlag {
	return &FeatureFlag{Name: name, constraints: constraints}
}

// IsSupported checks if a semantic version fits within a set of constraints
// pdVersion, standaloneVersion examples: "v5.2.2", "v5.3.0", "v5.4.0-alpha-xxx", "5.3.0" (semver can handle `v` prefix by itself)
// constraints examples: "~5.2.2", ">= 5.3.0", see semver docs to get more information
func (ff *FeatureFlag) IsSupported(targetVersion string) bool {
	curVersion := targetVersion
	if Standalone == "No" {
		curVersion = PDVersion
	}
	// drop "-alpha-xxx" suffix
	versionWithoutSuffix := strings.Split(curVersion, "-")[0]
	v, err := semver.NewVersion(versionWithoutSuffix)
	if err != nil {
		return false
	}
	for _, ver := range ff.constraints {
		c, err := semver.NewConstraint(ver)
		if err != nil {
			continue
		}
		if c.Check(v) {
			return true
		}
	}
	return false
}
