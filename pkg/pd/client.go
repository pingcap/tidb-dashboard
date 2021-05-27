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

package pd

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
	ErrPDClientRequestFailed = ErrNS.NewType("client_request_failed")
)

const (
	defaultPDTimeout = time.Second * 10
)

type Client struct {
	httpScheme   string
	baseURL      string
	httpClient   *httpc.Client
	lifecycleCtx context.Context
	timeout      time.Duration
}

func NewPDClient(lc fx.Lifecycle, httpClient *httpc.Client, config *config.Config) *Client {
	client := &Client{
		httpClient:   httpClient,
		httpScheme:   config.GetClusterHTTPScheme(),
		baseURL:      config.PDEndPoint,
		lifecycleCtx: nil,
		timeout:      defaultPDTimeout,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			client.lifecycleCtx = ctx
			return nil
		},
	})

	return client
}

func (c Client) WithBaseURL(baseURL string) *Client {
	c.baseURL = baseURL
	return &c
}

func (c Client) WithAddress(host string, port int) *Client {
	c.baseURL = fmt.Sprintf("%s://%s:%d", c.httpScheme, host, port)
	return &c
}

func (c Client) WithTimeout(timeout time.Duration) *Client {
	c.timeout = timeout
	return &c
}

func (c Client) WithBeforeRequest(callback func(req *http.Request)) *Client {
	c.httpClient.BeforeRequest = callback
	return &c
}

func (c *Client) Get(relativeURI string) (*httpc.Response, error) {
	uri := fmt.Sprintf("%s/pd/api/v1%s", c.baseURL, relativeURI)
	return c.httpClient.WithTimeout(c.timeout).Send(c.lifecycleCtx, uri, http.MethodGet, nil, ErrPDClientRequestFailed, "PD")
}

func (c *Client) SendGetRequest(relativeURI string) ([]byte, error) {
	res, err := c.Get(relativeURI)
	if err != nil {
		return nil, err
	}
	return res.Body()
}

func (c *Client) SendPostRequest(relativeURI string, body io.Reader) ([]byte, error) {
	uri := fmt.Sprintf("%s/pd/api/v1%s", c.baseURL, relativeURI)
	return c.httpClient.WithTimeout(c.timeout).SendRequest(c.lifecycleCtx, uri, http.MethodPost, body, ErrPDClientRequestFailed, "PD")
}
