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
	"time"

	"go.uber.org/fx"

	"github.com/go-resty/resty/v2"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
)

var (
	ErrTiKVClientRequestFailed = ErrNS.NewType("client_request_failed")
)

const (
	defaultTiKVStatusAPITimeout = time.Second * 10
)

type Client struct {
	defaultClient *resty.Client
	httpClient    *httpc.Client
	lifecycleCtx  context.Context

	clusterScheme string
}

func NewTiKVClient(lc fx.Lifecycle, httpClient *httpc.Client, config *config.Config) *Client {
	client := &Client{
		httpClient:    httpClient,
		lifecycleCtx:  nil,
		clusterScheme: config.GetClusterHTTPScheme(),
	}
	client.defaultClient = client.New()

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			client.lifecycleCtx = ctx
			return nil
		},
	})

	return client
}

func (c *Client) New() *resty.Client {
	return c.httpClient.New().
		SetTimeout(defaultTiKVStatusAPITimeout).
		OnBeforeRequest(func(rc *resty.Client, r *resty.Request) error {
			if r.Context() == nil {
				r.SetContext(c.lifecycleCtx)
			}
			return nil
		})
}

func (c *Client) NewClientWithHost(host string) *resty.Client {
	return c.New().
		SetHostURL(fmt.Sprintf("%s://%s", c.clusterScheme, host))
}

func (c *Client) NewRequest() *resty.Request {
	return c.defaultClient.R()
}
