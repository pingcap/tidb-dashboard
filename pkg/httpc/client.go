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
	"github.com/pingcap/log"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/config"
)

const (
	defaultTimeout = time.Second * 10
)

type Client struct {
	http.Client
	BeforeRequest func(req *http.Request)
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

func (c Client) WithBeforeRequest(callback func(req *http.Request)) *Client {
	c.BeforeRequest = callback
	return &c
}

type SendPending interface {
	Response() (*Response, error)
	Body() ([]byte, error)
}

func (c *Client) Send(
	ctx context.Context,
	uri string,
	method string,
	body io.Reader,
	errType *errorx.Type,
	errOriginComponent string) SendPending {
	return &Sender{
		client:             c,
		ctx:                ctx,
		uri:                uri,
		method:             method,
		body:               body,
		errType:            errType,
		errOriginComponent: errOriginComponent,
	}
}

type Sender struct {
	client             *Client
	ctx                context.Context
	uri                string
	method             string
	body               io.Reader
	errType            *errorx.Type
	errOriginComponent string
}

var _ SendPending = (*Sender)(nil)

func (s *Sender) Response() (*Response, error) {
	req, err := http.NewRequestWithContext(s.ctx, s.method, s.uri, s.body)
	if err != nil {
		e := s.errType.Wrap(err, "Failed to build %s API request", s.errOriginComponent)
		log.Warn("SendRequest failed", zap.String("uri", s.uri), zap.Error(err))
		return nil, e
	}

	if s.client.BeforeRequest != nil {
		s.client.BeforeRequest(req)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		e := s.errType.Wrap(err, "Failed to send %s API request", s.errOriginComponent)
		log.Warn("SendRequest failed", zap.String("uri", s.uri), zap.Error(err))
		return nil, e
	}

	if !(resp.StatusCode >= 200 && resp.StatusCode < 300) {
		defer resp.Body.Close()
		data, _ := ioutil.ReadAll(resp.Body)
		e := s.errType.New("Request failed with status code %d from %s API: %s", resp.StatusCode, s.errOriginComponent, string(data))
		log.Warn("SendRequest failed", zap.String("uri", s.uri), zap.Error(err))
		return nil, e
	}

	return &Response{resp}, nil
}

func (s *Sender) Body() ([]byte, error) {
	res, err := s.Response()
	if err != nil {
		return nil, err
	}
	return res.Body()
}

type Response struct {
	*http.Response
}

func (r *Response) Body() ([]byte, error) {
	defer r.Response.Body.Close()
	return ioutil.ReadAll(r.Response.Body)
}
