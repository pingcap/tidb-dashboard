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

package utils

import (
	"strings"

	"github.com/Masterminds/semver"

	"github.com/pingcap/tidb-dashboard/pkg/utils/version"
)

// IsVersionSupport checks if a semantic version fits within a set of constraints
// pdVersion, standaloneVersion examples: "v5.2.2", "v5.3.0", "v5.4.0-alpha-xxx", "5.3.0" (semver can handle `v` prefix by itself)
// constraints examples: "~5.2.2", ">= 5.3.0", see semver docs to get more information.
func IsVersionSupport(standaloneVersion string, constraints []string) bool {
	curVersion := standaloneVersion
	if version.Standalone == "No" {
		curVersion = version.PDVersion
	}
	// drop "-alpha-xxx" suffix
	versionWithoutSuffix := strings.Split(curVersion, "-")[0]
	v, err := semver.NewVersion(versionWithoutSuffix)
	if err != nil {
		return false
	}
	for _, ver := range constraints {
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