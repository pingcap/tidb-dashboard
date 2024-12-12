// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package metrics

import (
	"context"
	"time"

	"github.com/joomcode/errorx"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/atomic"
	"go.uber.org/fx"
	"golang.org/x/sync/singleflight"

	"github.com/pingcap/tidb-dashboard/pkg/config"
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
	Config     *config.Config
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
