// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package user

import (
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/shared"
)

var Module = fx.Options(
	fx.Provide(
		newAuthService,
		provideAuthenticatorRegister,
		shared.ProvideFeatureFlags,
	),
	fx.Invoke(registerRouter),
)
