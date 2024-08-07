// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package pd

import (
	"context"
	"time"

	"github.com/pingcap/log"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/utils"
)

func NewEtcdClient(lc fx.Lifecycle, config *config.Config) (*clientv3.Client, error) {
	zapCfg := zap.NewProductionConfig()
	zapCfg.Encoding = log.ZapEncodingName

	cli, err := clientv3.New(clientv3.Config{
		Endpoints:            []string{config.PDEndPoint},
		AutoSyncInterval:     30 * time.Second,
		DialTimeout:          5 * time.Second,
		DialKeepAliveTime:    utils.DefaultGRPCKeepaliveParams.Time,
		DialKeepAliveTimeout: utils.DefaultGRPCKeepaliveParams.Timeout,
		PermitWithoutStream:  utils.DefaultGRPCKeepaliveParams.PermitWithoutStream,
		DialOptions:          utils.DefaultGRPCDialOptions,
		TLS:                  config.ClusterTLSConfig,
		LogConfig:            &zapCfg,
	})

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			return cli.Close()
		},
	})

	return cli, err
}
