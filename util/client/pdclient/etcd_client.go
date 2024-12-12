// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package pdclient

import (
	"context"
	"crypto/tls"
	"time"

	"github.com/pingcap/log"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/backoff"
)

type EtcdClientConfig struct {
	Endpoints []string
	Context   context.Context
	TLS       *tls.Config
}

// NewEtcdClient creates a new etcd client. The client must be closed by calling `client.Close()`.
// Returns error when config is invalid.
func NewEtcdClient(config EtcdClientConfig) (*clientv3.Client, error) {
	zapCfg := zap.NewProductionConfig()
	zapCfg.Encoding = log.ZapEncodingName
	cli, err := clientv3.New(clientv3.Config{
		Context:              config.Context,
		Endpoints:            config.Endpoints,
		AutoSyncInterval:     30 * time.Second,
		DialTimeout:          5 * time.Second,
		DialKeepAliveTime:    10 * time.Second,
		DialKeepAliveTimeout: 3 * time.Second,
		PermitWithoutStream:  false,
		DialOptions: []grpc.DialOption{
			grpc.WithConnectParams(grpc.ConnectParams{
				Backoff: backoff.Config{
					BaseDelay:  100 * time.Millisecond, // Default was 1 second
					Multiplier: 1.6,                    // Default
					Jitter:     0.2,                    // Default
					MaxDelay:   3 * time.Second,        // Default was 120 seconds
				},
				MinConnectTimeout: 5 * time.Second, // Default was 20 seconds
			}),
		},
		TLS:       config.TLS,
		LogConfig: &zapCfg,
	})
	return cli, err
}
