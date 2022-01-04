// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package conprof

import (
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(newService),
	fx.Invoke(registerRouter),
)
