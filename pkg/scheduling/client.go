// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package scheduling

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

var ErrSchedulingClientRequestFailed = ErrNS.NewType("client_request_failed")

const (
	defaultSchedulingStatusAPITimeout = time.Second * 10
)

type Client struct {
	httpClient   *httpc.Client
	httpScheme   string
	lifecycleCtx context.Context
	timeout      time.Duration
}

func NewSchedulingClient(lc fx.Lifecycle, httpClient *httpc.Client, config *config.Config) *Client {
	client := &Client{
		httpClient:   httpClient,
		httpScheme:   config.GetClusterHTTPScheme(),
		lifecycleCtx: nil,
		timeout:      defaultSchedulingStatusAPITimeout,
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

func (c Client) AddRequestHeader(key, value string) *Client {
	c.httpClient = c.httpClient.CloneAndAddRequestHeader(key, value)
	return &c
}

func (c *Client) Get(host string, port int, relativeURI string) (*httpc.Response, error) {
	uri := fmt.Sprintf("%s://%s%s", c.httpScheme, net.JoinHostPort(host, strconv.Itoa(port)), relativeURI)
	return c.httpClient.WithTimeout(c.timeout).Send(c.lifecycleCtx, uri, http.MethodGet, nil, ErrSchedulingClientRequestFailed, distro.R().Scheduling)
}

func (c *Client) SendGetRequest(host string, port int, relativeURI string) ([]byte, error) {
	res, err := c.Get(host, port, relativeURI)
	if err != nil {
		return nil, err
	}
	return res.Body()
}

func (c *Client) SendPostRequest(host string, port int, relativeURI string, body io.Reader) ([]byte, error) {
	uri := fmt.Sprintf("%s://%s%s", c.httpScheme, net.JoinHostPort(host, strconv.Itoa(port)), relativeURI)
	return c.httpClient.WithTimeout(c.timeout).SendRequest(c.lifecycleCtx, uri, http.MethodPost, body, ErrSchedulingClientRequestFailed, distro.R().Scheduling)
}
