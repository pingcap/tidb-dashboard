// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

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
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/utils/distro"
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
	httpScheme   string
	lifecycleCtx context.Context
	timeout      time.Duration
	isRawBody    bool
	getEndpoints func() (map[string]struct{}, error)
}

func NewTiKVClient(lc fx.Lifecycle, httpClient *httpc.Client, pdClient *pd.Client, config *config.Config) *Client {
	cache := pd.NewEndpointCache()
	client := &Client{
		httpClient:   httpClient,
		httpScheme:   config.GetClusterHTTPScheme(),
		lifecycleCtx: nil,
		timeout:      defaultTiKVStatusAPITimeout,
		getEndpoints: func() (map[string]struct{}, error) {
			return cache.Func("tikv_endpoints", func() (map[string]struct{}, error) {
				return fetchEndpoints(pdClient)
			}, 10*time.Second)
		},
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

// WithRawBody means the body will not be read internally.
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
		SendRequest(c.lifecycleCtx, uri, http.MethodGet, nil, ErrTiKVClientRequestFailed, distro.Data("tikv"))
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
		SendRequest(c.lifecycleCtx, uri, http.MethodPost, body, ErrTiKVClientRequestFailed, distro.Data("tikv"))
}

// Check the request address is an valid tikv endpoint.
func (c *Client) checkAPIAddressValidity(addr string) (err error) {
	es, err := c.getEndpoints()
	if err != nil {
		return err
	}

	if _, ok := es[addr]; !ok {
		return ErrInvalidTiKVAddr.New("request address %s is invalid", addr)
	}

	return
}
