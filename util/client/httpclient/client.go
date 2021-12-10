// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

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

	kindTag    string
	transport  *http.Transport
	defaultCtx context.Context
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
		kindTag:    config.KindTag,
		transport:  newTransport(config.TLSConfig),
		defaultCtx: config.DefaultCtx,
	}
}

func (c *Client) LR() *LazyRequest {
	lReq := newRequest(c.kindTag, c.transport)
	if c.defaultCtx != nil {
		lReq.SetContext(c.defaultCtx)
	}
	return lReq
}
