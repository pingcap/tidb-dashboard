// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package user

import (
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/util/feature"
)

var FeatureFlagNonRootLogin = feature.NewFlag("nonRootLogin", []string{">= 5.3.0"})

var Module = fx.Options(
	fx.Provide(newAuthService),
	fx.Invoke(registerRouter, FeatureFlagNonRootLogin.Register()),
)
