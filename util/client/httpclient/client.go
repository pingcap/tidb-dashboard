// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Copyright (c) 2015-2021 Jeevanandam M (jeeva@myjeeva.com), All rights reserved.
// resty source code and usage is governed by a MIT style
// license that can be found in the LICENSE file.

package httpclient

import (
	"context"
	"crypto/tls"
	"net"
	"net/http"
	"runtime"
	"time"

	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/util/nocopy"
)

var (
	ErrNS            = errorx.NewNamespace("http_client")
	ErrRequestFailed = ErrNS.NewType("request_failed")
)

// Client caches connections for future re-use and should be reused instead of
// created as needed.
type Client struct {
	nocopy.NoCopy

	kindTag        string
	transport      http.RoundTripper
	defaultCtx     context.Context
	defaultBaseURL string
}

func newTransport(tlsConfig *tls.Config) *http.Transport {
	dialer := &net.Dialer{
		Timeout:   30 * time.Second,
		KeepAlive: 30 * time.Second,
	}
	return &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		DialContext:           dialer.DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          100,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		MaxIdleConnsPerHost:   runtime.GOMAXPROCS(0) + 1,
		TLSClientConfig:       tlsConfig,
	}
}

func New(config Config) *Client {
	return &Client{
		kindTag:        config.KindTag,
		transport:      newTransport(config.TLSConfig),
		defaultCtx:     config.DefaultCtx,
		defaultBaseURL: config.DefaultBaseURL,
	}
}

// Clone creates a new client with the same configuration. Subsequent SetXxx() calls will not
// affect the current client. The transport will be shared unless it is changed to something else later.
func (c *Client) Clone() *Client {
	return &Client{
		kindTag:        c.kindTag,
		transport:      c.transport,
		defaultCtx:     c.defaultCtx,
		defaultBaseURL: c.defaultBaseURL,
	}
}

// SetDefaultTransport sets the default HTTP transport for subsequent new requests.
// This function should be used only when you want to mock the request.
// In other cases, there is usually no need to use a customized HTTP transport.
func (c *Client) SetDefaultTransport(transport http.RoundTripper) *Client {
	c.transport = transport
	return c
}

// SetDefaultCtx sets the default context for subsequent new requests.
func (c *Client) SetDefaultCtx(ctx context.Context) *Client {
	c.defaultCtx = ctx
	return c
}

// SetDefaultBaseURL sets the default base URL for subsequent new requests.
func (c *Client) SetDefaultBaseURL(baseURL string) *Client {
	c.defaultBaseURL = baseURL
	return c
}

func (c *Client) LR() *LazyRequest {
	lReq := newRequest(c.kindTag, c.transport)
	if c.defaultCtx != nil {
		lReq.SetContext(c.defaultCtx)
	}
	if len(c.defaultBaseURL) > 0 {
		lReq.SetTLSAwareBaseURL(c.defaultBaseURL)
	}
	return lReq
}
