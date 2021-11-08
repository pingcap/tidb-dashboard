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
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/config"
)

var (
	supportedTiDBVersions = []string{">= 5.3.0"}
	featureSupported      *bool
)

func IsFeatureSupport(config *config.Config) (supported bool) {
	if featureSupported != nil {
		return *featureSupported
	}

	supported = utils.IsVersionSupport(config.FeatureVersion, supportedTiDBVersions)
	featureSupported = &supported
	return
}
