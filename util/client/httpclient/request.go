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
	"time"

	"github.com/go-resty/resty/v2"

	"github.com/pingcap/tidb-dashboard/util/nocopy"
)

const (
	defaultTimeout = time.Minute * 2 // Just a default long enough timeout.
)

// Request is a lightweight wrapper over resty.Request.
// Different to resty.Request, it enforces a timeout.
// WARN: This structure is not thread-safe.
type Request struct {
	nocopy.NoCopy

	inner *resty.Request

	ctx     context.Context
	timeout time.Duration
}

func newRequestFromClient(c *Client) *Request {
	return &Request{
		inner:   c.inner.R(),
		ctx:     c.ctx,
		timeout: defaultTimeout,
	}
}

func (r *Request) SetContext(ctx context.Context) *Request {
	if ctx != nil {
		r.ctx = ctx
	}
	return r
}

func (r *Request) SetTimeout(timeout time.Duration) *Request {
	r.timeout = timeout
	return r
}

// SetJSONResult expects a JSON response from the remote endpoint and specify how response is deserialized.
func (r *Request) SetJSONResult(res interface{}) *Request {
	// If we don't force a content type, when this content type is missing in the response,
	// the `Response.Result()` will silently produce an empty and valid structure without any errors.
	r.inner.ForceContentType("application/json")
	r.inner.SetResult(res)
	return r
}

// WARN: The returned cancelFunc must be called to avoid context leak.
func (r *Request) Get(url string) (context.CancelFunc, *resty.Response, error) {
	return r.Execute(resty.MethodGet, url)
}

// WARN: The returned cancelFunc must be called to avoid context leak.
func (r *Request) Post(url string) (context.CancelFunc, *resty.Response, error) {
	return r.Execute(resty.MethodPost, url)
}

// WARN: The returned cancelFunc must be called to avoid context leak.
func (r *Request) Put(url string) (context.CancelFunc, *resty.Response, error) {
	return r.Execute(resty.MethodPut, url)
}

// WARN: The returned cancelFunc must be called to avoid context leak.
func (r *Request) Delete(url string) (context.CancelFunc, *resty.Response, error) {
	return r.Execute(resty.MethodDelete, url)
}

// WARN: The returned cancelFunc must be called to avoid context leak.
func (r *Request) Execute(method, url string) (context.CancelFunc, *resty.Response, error) {
	baseCtx := r.ctx
	if baseCtx == nil {
		baseCtx = context.Background()
	}
	ctx, cancelFn := context.WithTimeout(baseCtx, r.timeout)
	r.inner.SetContext(ctx)
	resp, err := r.inner.Execute(method, url)
	return cancelFn, resp, err
}
