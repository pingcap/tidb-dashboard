// Copyright 2020 PingCAP, Inc.
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

package metrics

import (
	"context"
	"time"

	"github.com/joomcode/errorx"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/atomic"
	"go.uber.org/fx"
	"golang.org/x/sync/singleflight"

	"github.com/pingcap/tidb-dashboard/pkg/httpc"
	"github.com/pingcap/tidb-dashboard/pkg/pd"
)

var (
	ErrNS                          = errorx.NewNamespace("error.api.metrics")
	ErrLoadPrometheusAddressFailed = ErrNS.NewType("load_prom_address_failed")
	ErrPrometheusNotFound          = ErrNS.NewType("prom_not_found")
	ErrPrometheusQueryFailed       = ErrNS.NewType("prom_query_failed")
)

const (
	defaultPromQueryTimeout = time.Second * 30
)

type ServiceParams struct {
	fx.In
	HTTPClient *httpc.Client
	EtcdClient *clientv3.Client
	PDClient   *pd.Client
}

type Service struct {
	params       ServiceParams
	lifecycleCtx context.Context

	promRequestGroup singleflight.Group
	promAddressCache atomic.Value
}

func NewService(lc fx.Lifecycle, p ServiceParams) *Service {
	s := &Service{params: p}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			s.lifecycleCtx = ctx
			return nil
		},
	})

	return s
}
