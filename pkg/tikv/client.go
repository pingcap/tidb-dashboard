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

package tikv

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
	"github.com/pingcap/tidb-dashboard/pkg/utils/distro"
)

var (
	ErrTiKVClientRequestFailed = ErrNS.NewType("client_request_failed")
)

const (
	defaultTiKVStatusAPITimeout = time.Second * 10
)

type Client struct {
	httpClient   *httpc.Client
	httpScheme   string
	lifecycleCtx context.Context
	timeout      time.Duration
}

func NewTiKVClient(lc fx.Lifecycle, httpClient *httpc.Client, config *config.Config) *Client {
	client := &Client{
		httpClient:   httpClient,
		httpScheme:   config.GetClusterHTTPScheme(),
		lifecycleCtx: nil,
		timeout:      defaultTiKVStatusAPITimeout,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			client.lifecycleCtx = ctx
			return nil
		},
	})

	return client
}

func (c Client) WithTimeout(timeout time.Duration) *Client {
	c.timeout = timeout
	return &c
}

func (c *Client) Get(host string, statusPort int, relativeURI string) (*httpc.Response, error) {
	uri := fmt.Sprintf("%s://%s:%d%s", c.httpScheme, host, statusPort, relativeURI)
	return c.httpClient.WithTimeout(c.timeout).Send(c.lifecycleCtx, uri, http.MethodGet, nil, ErrTiKVClientRequestFailed, distro.Data("tikv"))
}

func (c *Client) SendGetRequest(host string, statusPort int, relativeURI string) ([]byte, error) {
	res, err := c.Get(host, statusPort, relativeURI)
	if err != nil {
		return nil, err
	}
	return res.Body()
}

func (c *Client) SendPostRequest(host string, statusPort int, relativeURI string, body io.Reader) ([]byte, error) {
	uri := fmt.Sprintf("%s://%s:%d%s", c.httpScheme, host, statusPort, relativeURI)
	return c.httpClient.WithTimeout(c.timeout).SendRequest(c.lifecycleCtx, uri, http.MethodPost, body, ErrTiKVClientRequestFailed, distro.Data("tikv"))
}
