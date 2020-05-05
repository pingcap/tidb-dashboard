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

package http

import (
	"context"
	"crypto/tls"
	"net"
	"net/http"
	"time"

	"go.uber.org/fx"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

const (
	Timeout = time.Second * 3
)

func NewHTTPClientWithConf(lc fx.Lifecycle, conf *config.Config) *http.Client {
	cli := &http.Client{
		Transport: &http.Transport{
			DialTLS: func(network, addr string) (net.Conn, error) {
				conn, err := tls.Dial(network, addr, conf.ClusterTLSConfig)
				return conn, err
			},
			TLSClientConfig: conf.ClusterTLSConfig,
		},
		Timeout: Timeout,
	}

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			cli.CloseIdleConnections()
			return nil
		},
	})

	return cli
}
