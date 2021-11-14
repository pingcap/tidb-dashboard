// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package user

import "github.com/pingcap/tidb-dashboard/util/versionutil"

var FeatureFlagNonRootLogin = versionutil.NewFeatureFlag("nonRootLogin", []string{">= 5.3.0"})
