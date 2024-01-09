// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package lifecyclectxtest

import (
	"context"

	"github.com/pingcap/tidb-dashboard/util/lifecyclectx"
)

type TestCtx struct {
	ctx context.Context
}

func BgCtx() lifecyclectx.Provider {
	return TestCtx{
		ctx: context.Background(),
	}
}

func (p TestCtx) GetLifecycleCtx() context.Context {
	return p.ctx
}
