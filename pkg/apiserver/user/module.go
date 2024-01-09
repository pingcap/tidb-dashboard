// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package user

import (
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(NewAuthService),
	fx.Invoke(registerRouter),
)
