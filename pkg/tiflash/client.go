// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package tiflash

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"strconv"
	"time"

	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
	"github.com/pingcap/tidb-dashboard/util/distro"
)

var ErrFlashClientRequestFailed = ErrNS.NewType("client_request_failed")

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

func (c Client) GetHTTPScheme() string {
	return c.httpScheme
}

func (c Client) WithTimeout(timeout time.Duration) *Client {
	c.timeout = timeout
	return &c
}

func (c Client) AddRequestHeader(key, value string) *Client {
	c.httpClient = c.httpClient.CloneAndAddRequestHeader(key, value)
	return &c
}

func (c *Client) Get(host string, statusPort int, relativeURI string) (*httpc.Response, error) {
	uri := fmt.Sprintf("%s://%s%s", c.httpScheme, net.JoinHostPort(host, strconv.Itoa(statusPort)), relativeURI)
	return c.httpClient.WithTimeout(c.timeout).Send(c.lifecycleCtx, uri, http.MethodGet, nil, ErrFlashClientRequestFailed, distro.R().TiFlash)
}

func (c *Client) SendGetRequest(host string, statusPort int, relativeURI string) ([]byte, error) {
	res, err := c.Get(host, statusPort, relativeURI)
	if err != nil {
		return nil, err
	}
	return res.Body()
}

func (c *Client) SendPostRequest(host string, statusPort int, relativeURI string, body io.Reader) ([]byte, error) {
	uri := fmt.Sprintf("%s://%s%s", c.httpScheme, net.JoinHostPort(host, strconv.Itoa(statusPort)), relativeURI)
	return c.httpClient.WithTimeout(c.timeout).SendRequest(c.lifecycleCtx, uri, http.MethodPost, body, ErrFlashClientRequestFailed, distro.R().TiFlash)
}
