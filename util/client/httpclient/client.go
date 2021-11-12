// Copyright 2021 PingCAP, Inc.
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

// Copyright (c) 2015-2021 Jeevanandam M (jeeva@myjeeva.com), All rights reserved.
// resty source code and usage is governed by a MIT style
// license that can be found in the LICENSE file.

package httpclient

import (
	"context"
	"errors"
	"fmt"

	"github.com/go-resty/resty/v2"
	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/nocopy"
)

var (
	ErrNS              = errorx.NewNamespace("http_client")
	ErrInvalidEndpoint = ErrNS.NewType("invalid_endpoint")
	ErrServerError     = ErrNS.NewType("server_error")
)

// Client is a lightweight wrapper over resty.Client, providing default error handling and timeout settings.
// WARN: This structure is not thread-safe.
type Client struct {
	nocopy.NoCopy

	inner   *resty.Client
	kindTag string
	ctx     context.Context
}

func (c *Client) SetHeader(header, value string) *Client {
	c.inner.Header.Set(header, value)
	return c
}

// LifecycleR builds a new Request with the default lifecycle context and the default timeout.
// This function is intentionally not named as `R()` to avoid being confused with `resty.Client.R()`.
func (c *Client) LifecycleR() *Request {
	return newRequestFromClient(c)
}

// ======== Below are helper functions to build the Client ========

var defaultRedirectPolicy = resty.FlexibleRedirectPolicy(5)

func New(config Config) *Client {
	c := &Client{
		inner:   resty.New(),
		kindTag: config.KindTag,
		ctx:     config.Context,
	}
	c.inner.SetRedirectPolicy(defaultRedirectPolicy)
	c.inner.OnAfterResponse(c.handleAfterResponseHook)
	c.inner.OnError(c.handleErrorHook)
	c.inner.SetHostURL(config.BaseURL)
	c.inner.SetTLSClientConfig(config.TLS)
	return c
}

func (c *Client) handleAfterResponseHook(_ *resty.Client, r *resty.Response) error {
	// Note: IsError != !IsSuccess
	if !r.IsSuccess() {
		// Turn all non success responses to an error.
		return ErrServerError.New("%s %s (%s): Response status %d",
			r.Request.Method,
			r.Request.URL,
			c.kindTag,
			r.StatusCode())
	}
	return nil
}

func (c *Client) handleErrorHook(req *resty.Request, err error) {
	// Log all kind of errors
	fields := []zap.Field{
		zap.String("kindTag", c.kindTag),
		zap.String("url", req.URL),
	}
	var respErr *resty.ResponseError
	if errors.As(err, &respErr) && respErr.Response != nil && respErr.Response.RawResponse != nil {
		fields = append(fields,
			zap.String("responseStatus", respErr.Response.Status()),
			zap.String("responseBody", respErr.Response.String()),
		)
		err = respErr.Unwrap()
	}
	fields = append(fields, zap.Error(err))
	if _, hasVerboseError := err.(fmt.Formatter); !hasVerboseError { //nolint:errorlint
		fields = append(fields, zap.Stack("stack"))
	}
	log.Warn("Request failed", fields...)
}
