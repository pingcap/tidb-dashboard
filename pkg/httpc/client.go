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
	"io/ioutil"
	"net"
	"net/http"
	"time"

	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

const (
	defaultTimeout = time.Second * 10
)

type Client struct {
	http.Client
}

func NewHTTPClient(lc fx.Lifecycle, config *config.Config) *Client {
	cli := http.Client{
		Transport: &http.Transport{
			DialTLS: func(network, addr string) (net.Conn, error) {
				conn, err := tls.Dial(network, addr, config.ClusterTLSConfig)
				return conn, err
			},
			TLSClientConfig: config.ClusterTLSConfig,
		},
		Timeout: defaultTimeout,
	}

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			cli.CloseIdleConnections()
			return nil
		},
	})

	return &Client{
		Client: cli,
	}
}

func (c *Client) WithTimeout(timeout time.Duration) *Client {
	c2 := *c
	c2.Timeout = timeout
	return &c2
}

func (c *Client) SendGetRequest(
	ctx context.Context,
	uri string,
	errType *errorx.Type,
	errOriginComponent string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", uri, nil)
	if err != nil {
		log.Warn("Build API request failed", zap.String("uri", uri), zap.Error(err))
		return nil, errType.Wrap(err, "failed to build %s API request", errOriginComponent)
	}

	resp, err := c.Do(req)
	if err != nil {
		log.Warn("Send API request failed", zap.String("uri", uri), zap.Error(err))
		return nil, errType.Wrap(err, "failed to send request %s API request", errOriginComponent)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		log.Warn("Receive non success API response", zap.String("uri", uri), zap.Int("statusCode", resp.StatusCode))
		return nil, errType.New("received non success status code %d from %s API", resp.StatusCode, errOriginComponent)
	}

	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Warn("Read API response failed", zap.String("uri", uri), zap.Error(err))
		return nil, errType.Wrap(err, "failed to read %s API response", errOriginComponent)
	}

	return data, nil
}
