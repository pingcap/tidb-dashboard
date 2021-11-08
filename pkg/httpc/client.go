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

package httpc

import (
	"context"
	"crypto/tls"
	"io"
	"io/ioutil"
	"net"
	"net/http"
	"time"

	"github.com/joomcode/errorx"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap/log"

	"github.com/pingcap/tidb-dashboard/pkg/config"
)

const (
	defaultTimeout = time.Second * 10
)

type BeforeRequestFunc func(req *http.Request)

type Client struct {
	http.Client
	beforeRequest BeforeRequestFunc
	isRawBody     bool
}

func NewHTTPClient(lc fx.Lifecycle, config *config.Config) *Client {
	cli := http.Client{
		Transport: &http.Transport{
			DialTLS: func(network, addr string) (net.Conn, error) {
				conn, err := tls.Dial(network, addr, config.ClusterTLSConfig)
				return conn, err
			},
			TLSClientConfig: config.ClusterTLSConfig,
		},
		Timeout: defaultTimeout,
	}

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			cli.CloseIdleConnections()
			return nil
		},
	})

	return &Client{
		Client: cli,
	}
}

func (c Client) WithTimeout(timeout time.Duration) *Client {
	c.Timeout = timeout
	return &c
}

func (c Client) WithBeforeRequest(callback BeforeRequestFunc) *Client {
	c.beforeRequest = callback
	return &c
}

// WithRawBody means response body will not be read internally
func (c Client) WithRawBody(r bool) *Client {
	c.isRawBody = r
	return &c
}

func (c *Client) SendRequest(
	ctx context.Context,
	uri string,
	method string,
	body io.Reader,
	errType *errorx.Type,
	errOriginComponent string,
) (*Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, uri, body)
	if err != nil {
		e := errType.Wrap(err, "Failed to build %s API request", errOriginComponent)
		log.Warn("SendRequest failed", zap.String("uri", uri), zap.Error(err))
		return nil, e
	}

	if c.beforeRequest != nil {
		c.beforeRequest(req)
	}

	resp, err := c.Do(req)
	if err != nil {
		e := errType.Wrap(err, "Failed to send %s API request", errOriginComponent)
		log.Warn("SendRequest failed", zap.String("uri", uri), zap.Error(err))
		return nil, e
	}

	var data []byte
	if !c.isRawBody {
		data, err = ioutil.ReadAll(resp.Body)
		defer resp.Body.Close()
		if err != nil {
			e := errType.Wrap(err, "Failed to read %s API response", errOriginComponent)
			log.Warn("SendRequest failed", zap.String("uri", uri), zap.Error(err))
			return nil, e
		}
	}

	if !(resp.StatusCode >= 200 && resp.StatusCode < 300) {
		e := errType.New("Request failed with status code %d from %s API: %s", resp.StatusCode, errOriginComponent, string(data))
		log.Warn("SendRequest failed", zap.String("uri", uri), zap.Error(err))
		return nil, e
	}

	return &Response{RawResponse: resp, Body: data}, nil
}

type Response struct {
	RawResponse *http.Response
	Body        []byte
}
