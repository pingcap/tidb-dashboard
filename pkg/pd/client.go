// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

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
	"github.com/pingcap/tidb-dashboard/pkg/utils/distro"
)

var ErrPDClientRequestFailed = ErrNS.NewType("client_request_failed")

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

func (c Client) AddHeader(key, value string) *Client {
	c.httpClient = c.httpClient.CloneAndAddHeader(key, value)
	return &c
}

func (c *Client) Get(relativeURI string) (*httpc.Response, error) {
	uri := fmt.Sprintf("%s/pd/api/v1%s", c.baseURL, relativeURI)
	return c.httpClient.WithTimeout(c.timeout).Send(c.lifecycleCtx, uri, http.MethodGet, nil, ErrPDClientRequestFailed, distro.Data("pd"))
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
	return c.httpClient.WithTimeout(c.timeout).SendRequest(c.lifecycleCtx, uri, http.MethodPost, body, ErrPDClientRequestFailed, distro.Data("pd"))
}
