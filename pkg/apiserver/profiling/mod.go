// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/view"
)

var Mod = fx.Options(
	fx.Provide(NewStandardModelImpl),
	fx.Provide(view.NewView),
	fx.Invoke(view.RegisterRouter),
)
