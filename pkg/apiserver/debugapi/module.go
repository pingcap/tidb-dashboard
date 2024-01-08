// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package debugapi

import "go.uber.org/fx"

var Module = fx.Options(
	fx.Provide(newService),
	fx.Invoke(registerRouter),
)
