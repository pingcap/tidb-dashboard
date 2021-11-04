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

package conprof

import (
	"strings"

	"github.com/Masterminds/semver"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/utils/version"
)

var (
	supportedTiDBVersions = []string{"~5.3.0"}
	featureEnabled        *bool
)

func IsFeatureEnable(config *config.Config) (enabled bool) {
	if featureEnabled != nil {
		return *featureEnabled
	}

	enabled = false
	featureEnabled = &enabled

	curVersion := ""
	if version.Standalone == "No" {
		curVersion = version.PDVersion
	} else {
		curVersion = config.FeatureVersion
	}
	versionWithoutSuffix := strings.Split(curVersion, "-")[0]
	v, err := semver.NewVersion(versionWithoutSuffix)
	if err != nil {
		return
	}
	for _, ver := range supportedTiDBVersions {
		c, err := semver.NewConstraint(ver)
		if err != nil {
			continue
		}
		if c.Check(v) {
			enabled = true
			return
		}
	}
	return
}
