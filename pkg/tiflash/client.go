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
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/utils/distro"
)

var (
	ErrFlashClientRequestFailed = ErrNS.NewType("client_request_failed")
	ErrInvalidTiFlashAddr       = ErrNS.NewType("invalid_tiflash_addr")
)

const (
	defaultTiFlashStatusAPITimeout = time.Second * 10
)

type Client struct {
	httpClient   *httpc.Client
	httpScheme   string
	lifecycleCtx context.Context
	timeout      time.Duration
	isRawBody    bool
	memberHub    *memberHub
}

func NewTiFlashClient(lc fx.Lifecycle, httpClient *httpc.Client, pdClient *pd.Client, config *config.Config) *Client {
	memberHub := newMemberHub(pdClient)
	client := &Client{
		httpClient:   httpClient,
		httpScheme:   config.GetClusterHTTPScheme(),
		lifecycleCtx: nil,
		timeout:      defaultTiFlashStatusAPITimeout,
		memberHub:    memberHub,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			client.lifecycleCtx = ctx
			return nil
		},
		OnStop: func(c context.Context) error {
			return memberHub.Close()
		},
	})

	return client
}

func (c Client) WithTimeout(timeout time.Duration) *Client {
	c.timeout = timeout
	return &c
}

// WithRawBody means the body will not be read internally
func (c Client) WithRawBody(r bool) *Client {
	c.isRawBody = r
	return &c
}

func (c *Client) Get(host string, statusPort int, relativeURI string) (*httpc.Response, error) {
	addr := fmt.Sprintf("%s:%d", host, statusPort)
	if err := c.checkAPIAddressValidity(addr); err != nil {
		return nil, err
	}

	uri := fmt.Sprintf("%s://%s%s", c.httpScheme, addr, relativeURI)
	return c.httpClient.
		WithTimeout(c.timeout).
		WithRawBody(c.isRawBody).
		SendRequest(c.lifecycleCtx, uri, http.MethodGet, nil, ErrFlashClientRequestFailed, distro.Data("tiflash"))
}

func (c *Client) Post(host string, statusPort int, relativeURI string, body io.Reader) (*httpc.Response, error) {
	addr := fmt.Sprintf("%s:%d", host, statusPort)
	if err := c.checkAPIAddressValidity(addr); err != nil {
		return nil, err
	}

	uri := fmt.Sprintf("%s://%s%s", c.httpScheme, addr, relativeURI)
	return c.httpClient.
		WithTimeout(c.timeout).
		WithRawBody(c.isRawBody).
		SendRequest(c.lifecycleCtx, uri, http.MethodPost, body, ErrFlashClientRequestFailed, distro.Data("tiflash"))
}

// Check the request address is an valid tiflash endpoint
func (c *Client) checkAPIAddressValidity(addr string) (err error) {
	es, err := c.memberHub.GetEndpoints()
	if err != nil {
		return err
	}

	if _, ok := es[addr]; !ok {
		return ErrInvalidTiFlashAddr.New("request address %s is invalid", addr)
	}

	return
}
