// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package lifecyclectx

import (
	"context"
	"sync/atomic"

	"go.uber.org/fx"
)

// Provider is an easy way to access a lifecycle context on-demand.
type Provider interface {
	GetLifecycleCtx() context.Context
}

// FxCtx provide the lifecycle from Fx App Lifecycle.
type FxCtx struct {
	ctx atomic.Value
}

func NewFxCtx(lc fx.Lifecycle) Provider {
	p := &FxCtx{
		ctx: atomic.Value{},
	}
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			if ctx != nil {
				p.ctx.Store(ctx)
			}
			return nil
		},
	})
	return p
}

func (p FxCtx) GetLifecycleCtx() context.Context {
	ctx := p.ctx.Load()
	if ctx == nil {
		panic("lifecyclectx.FxCtx is not registered or not initialized yet")
	}
	return ctx.(context.Context)
}
