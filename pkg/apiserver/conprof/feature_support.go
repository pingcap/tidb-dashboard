// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

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
