// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/svc"
)

var Mod = fx.Options(
	fx.Provide(NewStandardBackend),
	fx.Provide(svc.NewService),
	fx.Invoke(svc.RegisterRouter),
)
