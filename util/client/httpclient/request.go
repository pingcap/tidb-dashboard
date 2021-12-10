// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

// Copyright (c) 2015-2021 Jeevanandam M (jeeva@myjeeva.com), All rights reserved.
// resty source code and usage is governed by a MIT style
// license that can be found in the LICENSE file.

package httpclient

import (
	"context"
	"net/http"
	"time"

	"github.com/go-resty/resty/v2"

	"github.com/pingcap/tidb-dashboard/util/nocopy"
)

// LazyRequest can be used to compose and fire individual request from the client.
// The request will not be actually sent until reading from LazyResponse.
type LazyRequest struct {
	// Note: this is a lazy struct.
	nocopy.NoCopy

	kindTag   string
	transport *http.Transport
	opsR      []requestUpdateFn
	opsC      []clientUpdateFn
}

func newRequest(kindTag string, transport *http.Transport) *LazyRequest {
	return &LazyRequest{
		kindTag:   kindTag,
		transport: transport,
	}
}

// Clone creates a new request with all settings cloned.
func (lReq *LazyRequest) Clone() *LazyRequest {
	lReqCloned := &LazyRequest{
		kindTag:   lReq.kindTag,
		transport: lReq.transport, // transport will never change after creation, so this is concurrent-safe
		opsR:      make([]requestUpdateFn, len(lReq.opsR)),
		opsC:      make([]clientUpdateFn, len(lReq.opsC)),
	}
	copy(lReqCloned.opsR, lReq.opsR)
	copy(lReqCloned.opsC, lReq.opsC)
	return lReqCloned
}

// SetContext sets the context.Context for current request. It allows
// to interrupt the request execution if ctx.Done() channel is closed.
// See https://blog.golang.org/context article and the "context" package
// documentation.
func (lReq *LazyRequest) SetContext(ctx context.Context) *LazyRequest {
	if ctx == nil {
		return lReq
	}
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetContext(ctx)
	})
	return lReq
}

// SetTimeout sets the total timeout for sending the request and reading the response.
func (lReq *LazyRequest) SetTimeout(timeout time.Duration) *LazyRequest {
	lReq.opsC = append(lReq.opsC, func(c *resty.Client) {
		c.SetTimeout(timeout)
	})
	return lReq
}

// SetURL sets the URL for current request. This URL will be used when calling Send().
//  	resp := client.LR().
//  		SetMethod("GET").
// 			SetURL("http://httpbin.org/get").
//			Send()
func (lReq *LazyRequest) SetURL(url string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.URL = url
	})
	return lReq
}

// SetMethod sets the method of the request. This method will be used when calling Send().
//  	resp := client.LR().
//  		SetMethod("GET").
// 			SetURL("http://httpbin.org/get").
//			Send()
func (lReq *LazyRequest) SetMethod(method string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.Method = method
	})
	return lReq
}

// SetBaseURL sets the base URL for current request. Relative URLs will be based on this base URL.
//		resp := client.LR().
//			SetBaseURL("http://myjeeva.com").
//			Get("/foo")
func (lReq *LazyRequest) SetBaseURL(baseURL string) *LazyRequest {
	lReq.opsC = append(lReq.opsC, func(c *resty.Client) {
		c.SetHostURL(baseURL)
	})
	return lReq
}

// Send method lazily send the HTTP request using the method and URL already defined
// for current LazyRequest.
//  	resp := client.LR().
//  		SetMethod("GET").
// 			SetURL("http://httpbin.org/get").
//			Send()
func (lReq *LazyRequest) Send() *LazyResponse {
	return newResponse(lReq.Clone())
}

// Execute lazily sends the HTTP request with given HTTP method and URL
// for current LazyRequest.
//  	resp := client.LR().
//  		Execute("GET", "http://httpbin.org/get")
func (lReq *LazyRequest) Execute(method, url string) *LazyResponse {
	cloned := lReq.Clone()
	cloned.opsR = append(cloned.opsR, func(r *resty.Request) {
		r.Method = method
		r.URL = url
	})
	return newResponse(cloned)
}

// Get lazily sends a GET request with the specified URL for current LazyRequest.
func (lReq *LazyRequest) Get(url string) *LazyResponse {
	return lReq.Execute(resty.MethodGet, url)
}

// Post lazily sends a POST request with the specified URL for current LazyRequest.
func (lReq *LazyRequest) Post(url string) *LazyResponse {
	return lReq.Execute(resty.MethodPost, url)
}

// Put lazily sends a PUT request with the specified URL for current LazyRequest.
func (lReq *LazyRequest) Put(url string) *LazyResponse {
	return lReq.Execute(resty.MethodPut, url)
}

// Delete lazily sends a DELETE request with the specified URL for current LazyRequest.
func (lReq *LazyRequest) Delete(url string) *LazyResponse {
	return lReq.Execute(resty.MethodDelete, url)
}
