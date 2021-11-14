// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package conprof

import (
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/util/feature"
)

var FeatureFlagConprof = feature.NewFlag("conprof", []string{">= 5.3.0"})

var Module = fx.Options(
	fx.Provide(newService),
	fx.Invoke(registerRouter, FeatureFlagConprof.Register()),
)
