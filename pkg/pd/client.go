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
	"github.com/pingcap/tidb-dashboard/pkg/utils/host"
)

var (
	ErrPDClientRequestFailed = ErrNS.NewType("client_request_failed")
	ErrInvalidPDAddr         = ErrNS.NewType("invalid_pd_addr")
)

const (
	defaultPDTimeout = time.Second * 10
)

type Client struct {
	httpScheme     string
	configEndpoint string
	baseURL        string
	httpClient     *httpc.Client
	lifecycleCtx   context.Context
	timeout        time.Duration
	beforeRequest  httpc.BeforeRequestFunc
	isRawBody      bool
	getEndpoints   func() (map[string]struct{}, error)
}

func NewPDClient(lc fx.Lifecycle, httpClient *httpc.Client, config *config.Config) *Client {
	client := &Client{
		httpClient:     httpClient,
		httpScheme:     config.GetClusterHTTPScheme(),
		configEndpoint: config.PDEndPoint,
		baseURL:        "",
		lifecycleCtx:   nil,
		timeout:        defaultPDTimeout,
	}

	cache := NewEndpointCache()
	client.getEndpoints = func() (map[string]struct{}, error) {
		return cache.Func("pd_endpoints", func() (map[string]struct{}, error) {
			return fetchEndpoints(client)
		}, 10*time.Second)
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

func (c Client) WithBeforeRequest(callback httpc.BeforeRequestFunc) *Client {
	c.beforeRequest = callback
	return &c
}

// WithRawBody means the body will not be read internally.
func (c Client) WithRawBody(r bool) *Client {
	c.isRawBody = r
	return &c
}

func (c *Client) Get(relativeURI string) (*httpc.Response, error) {
	if c.needCheckAddress() {
		if err := c.checkAPIAddressValidity(); err != nil {
			return nil, err
		}
	}
	return c.unsafeGet(relativeURI)
}

func (c *Client) Post(relativeURI string, requestBody io.Reader) (*httpc.Response, error) {
	if c.needCheckAddress() {
		if err := c.checkAPIAddressValidity(); err != nil {
			return nil, err
		}
	}
	return c.unsafePost(relativeURI, requestBody)
}

// UnsafeGet requires user to ensure the validity of request address to avoid SSRF.
func (c *Client) unsafeGet(relativeURI string) (*httpc.Response, error) {
	uri := fmt.Sprintf("%s%s", c.resolveAPIAddress(), relativeURI)
	return c.httpClient.
		WithTimeout(c.timeout).
		WithBeforeRequest(c.beforeRequest).
		WithRawBody(c.isRawBody).
		SendRequest(c.lifecycleCtx, uri, http.MethodGet, nil, ErrPDClientRequestFailed, distro.Data("pd"))
}

// UnsafePost requires user to ensure the validity of request address to avoid SSRF.
func (c *Client) unsafePost(relativeURI string, requestBody io.Reader) (*httpc.Response, error) {
	uri := fmt.Sprintf("%s%s", c.resolveAPIAddress(), relativeURI)
	return c.httpClient.
		WithTimeout(c.timeout).
		WithBeforeRequest(c.beforeRequest).
		WithRawBody(c.isRawBody).
		SendRequest(c.lifecycleCtx, uri, http.MethodPost, requestBody, ErrPDClientRequestFailed, distro.Data("pd"))
}

func (c *Client) resolveAPIAddress() string {
	var baseURL string
	if c.baseURL != "" {
		baseURL = c.baseURL
	} else {
		baseURL = c.configEndpoint
	}
	return fmt.Sprintf("%s/pd/api/v1", baseURL)
}

// According to `resolveAPIAddress`, the request will be
// sent to config.PDEndpoint if the baseURL is not specified.
func (c *Client) needCheckAddress() bool {
	return c.baseURL != ""
}

// Check the request address is an valid pd endpoint.
func (c *Client) checkAPIAddressValidity() (err error) {
	es, err := c.getEndpoints()
	if err != nil {
		return err
	}

	ip, port, _ := host.ParseHostAndPortFromAddressURL(c.baseURL)
	if _, ok := es[fmt.Sprintf("%s:%d", ip, port)]; !ok {
		return ErrInvalidPDAddr.New("request address %s is invalid", c.baseURL)
	}

	return
}
