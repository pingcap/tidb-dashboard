// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package deadlock

import "go.uber.org/fx"

var Module = fx.Options(
	fx.Provide(newService),
	fx.Invoke(registerRouter),
)
