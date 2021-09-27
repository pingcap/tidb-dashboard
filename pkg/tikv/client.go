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

	"github.com/ReneKroon/ttlcache/v2"
	"github.com/thoas/go-funk"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/utils/distro"
	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
)

var (
	ErrTiKVClientRequestFailed = ErrNS.NewType("client_request_failed")
	ErrInvalidTiKVAddr         = ErrNS.NewType("invalid_tikv_addr")
)

const (
	defaultTiKVStatusAPITimeout = time.Second * 10
)

type Client struct {
	httpClient   *httpc.Client
	pdClient     *pd.Client
	httpScheme   string
	lifecycleCtx context.Context
	timeout      time.Duration
	cache        *ttlcache.Cache
}

func NewTiKVClient(lc fx.Lifecycle, httpClient *httpc.Client, pdClient *pd.Client, config *config.Config) *Client {
	cache := ttlcache.NewCache()
	cache.SkipTTLExtensionOnHit(true)
	client := &Client{
		httpClient:   httpClient,
		pdClient:     pdClient,
		httpScheme:   config.GetClusterHTTPScheme(),
		lifecycleCtx: nil,
		timeout:      defaultTiKVStatusAPITimeout,
		cache:        cache,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			client.lifecycleCtx = ctx
			return nil
		},
		OnStop: func(c context.Context) error {
			return cache.Close()
		},
	})

	return client
}

func (c Client) WithTimeout(timeout time.Duration) *Client {
	c.timeout = timeout
	return &c
}

func (c *Client) Get(host string, statusPort int, relativeURI string) (*httpc.Response, error) {
	err := c.checkValidAddress(fmt.Sprintf("%s:%d", host, statusPort))
	if err != nil {
		return nil, err
	}

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
	err := c.checkValidAddress(fmt.Sprintf("%s:%d", host, statusPort))
	if err != nil {
		return nil, err
	}

	uri := fmt.Sprintf("%s://%s:%d%s", c.httpScheme, host, statusPort, relativeURI)
	return c.httpClient.WithTimeout(c.timeout).SendRequest(c.lifecycleCtx, uri, http.MethodPost, body, ErrTiKVClientRequestFailed, distro.Data("tikv"))
}

func (c *Client) getMemberAddrs() ([]string, error) {
	cached, _ := c.cache.Get("tikv_member_addrs")
	if cached != nil {
		return cached.([]string), nil
	}

	tikvTopos, _, err := topology.FetchStoreTopology(c.pdClient)
	if err != nil {
		return nil, err
	}
	addrs := []string{}
	for _, topo := range tikvTopos {
		addrs = append(addrs, fmt.Sprintf("%s:%d", topo.IP, topo.StatusPort))
	}

	_ = c.cache.SetWithTTL("tikv_member_addrs", tikvTopos, 10*time.Second)

	return addrs, nil
}

func (c *Client) checkValidAddress(addr string) error {
	addrs, err := c.getMemberAddrs()
	if err != nil {
		return err
	}
	isValid := funk.Contains(addrs, func(mAddr string) bool {
		return mAddr == addr
	})
	if !isValid {
		return ErrInvalidTiKVAddr.New("request address %s is invalid", addr)
	}
	return nil
}
