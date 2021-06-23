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

package httpc

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/go-resty/resty/v2"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap/log"

	"github.com/pingcap/tidb-dashboard/pkg/config"
)

const (
	defaultTimeout = time.Second * 10
)

type Client struct {
	defaultClient *resty.Client
	transport     *http.Transport
}

func NewHTTPClient(lc fx.Lifecycle, config *config.Config) *Client {
	transport := &http.Transport{
		DialTLS: func(network, addr string) (net.Conn, error) {
			conn, err := tls.Dial(network, addr, config.ClusterTLSConfig)
			return conn, err
		},
		TLSClientConfig: config.ClusterTLSConfig,
	}
	client := &Client{transport: transport}
	client.defaultClient = client.New()

	lc.Append(fx.Hook{
		OnStop: func(c context.Context) error {
			transport.CloseIdleConnections()
			return nil
		},
	})

	return client
}

func (c *Client) New() *resty.Client {
	client := resty.New().
		SetTransport(c.transport).
		SetTimeout(defaultTimeout).
		OnAfterResponse(func(c *resty.Client, r *resty.Response) error {
			if r.IsError() {
				err := fmt.Errorf(string(r.Body()))
				log.Warn("SendRequest failed", zap.Strings("Request", []string{r.Request.Method, r.Request.URL}), zap.Error(err))
				return err
			}
			return nil
		})
	return client
}

func (c *Client) NewRequest() *resty.Request {
	return c.defaultClient.R()
}
