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

package tiflash

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
)

var (
	ErrFlashClientRequestFailed = ErrNS.NewType("client_request_failed")
)

const (
	defaultTiFlashStatusAPITimeout = time.Second * 10
)

type Client struct {
	httpClient   *httpc.Client
	httpScheme   string
	lifecycleCtx context.Context
	timeout      time.Duration
}

func NewTiFlashClient(lc fx.Lifecycle, httpClient *httpc.Client, config *config.Config) *Client {
	client := &Client{
		httpClient:   httpClient,
		httpScheme:   config.GetClusterHTTPScheme(),
		lifecycleCtx: nil,
		timeout:      defaultTiFlashStatusAPITimeout,
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

func (c *Client) Get(host string, statusPort int, relativeUri string) (*httpc.Response, error) {
	uri := fmt.Sprintf("%s://%s:%d%s", c.httpScheme, host, statusPort, relativeUri)
	return c.httpClient.WithTimeout(c.timeout).Send(c.lifecycleCtx, uri, http.MethodGet, nil, ErrFlashClientRequestFailed, "TiFlash")
}

func (c *Client) SendGetRequest(host string, statusPort int, relativeUri string) ([]byte, error) {
	res, err := c.Get(host, statusPort, relativeUri)
	if err != nil {
		return nil, err
	}
	return res.Body()
}

func (c *Client) SendPostRequest(host string, statusPort int, relativeUri string, body io.Reader) ([]byte, error) {
	uri := fmt.Sprintf("%s://%s:%d%s", c.httpScheme, host, statusPort, relativeUri)
	return c.httpClient.WithTimeout(c.timeout).SendRequest(c.lifecycleCtx, uri, http.MethodPost, body, ErrFlashClientRequestFailed, "TiFlash")
}
