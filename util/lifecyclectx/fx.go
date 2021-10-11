// Copyright 2021 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

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
