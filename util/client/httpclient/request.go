// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Copyright (c) 2015-2021 Jeevanandam M (jeeva@myjeeva.com), All rights reserved.
// resty source code and usage is governed by a MIT style
// license that can be found in the LICENSE file.

package httpclient

import (
	"context"
	"net/http"
	"strings"
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
	debugTag  string
	transport http.RoundTripper
	opsR      []requestUpdateFn
	opsC      []clientUpdateFn
}

func newRequest(kindTag string, transport http.RoundTripper) *LazyRequest {
	return &LazyRequest{
		kindTag:   kindTag,
		transport: transport,
	}
}

// Clone creates a new request with all settings cloned.
func (lReq *LazyRequest) Clone() *LazyRequest {
	lReqCloned := &LazyRequest{
		kindTag:   lReq.kindTag,
		debugTag:  lReq.debugTag,
		transport: lReq.transport, // transport will never change after creation, so this is concurrent-safe
		opsR:      make([]requestUpdateFn, len(lReq.opsR)),
		opsC:      make([]clientUpdateFn, len(lReq.opsC)),
	}
	copy(lReqCloned.opsR, lReq.opsR)
	copy(lReqCloned.opsC, lReq.opsC)
	return lReqCloned
}

// SetDebugTag enables the debugging log if tag is not empty, or disables it otherwise.
// The debugging log will be printed with log level INFO.
func (lReq *LazyRequest) SetDebugTag(debugTag string) *LazyRequest {
	lReq.debugTag = debugTag
	return lReq
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
//
//	 	resp := client.LR().
//	 		SetMethod("GET").
//				SetURL("http://httpbin.org/get").
//				Send()
func (lReq *LazyRequest) SetURL(url string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.URL = url
	})
	return lReq
}

// SetMethod sets the method of the request. This method will be used when calling Send().
//
//	 	resp := client.LR().
//	 		SetMethod("GET").
//				SetURL("http://httpbin.org/get").
//				Send()
func (lReq *LazyRequest) SetMethod(method string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.Method = method
	})
	return lReq
}

func isMTLSConfigured(r http.RoundTripper) bool {
	transport, ok := r.(*http.Transport)
	if !ok {
		return false
	}
	if transport.TLSClientConfig == nil {
		return false
	}
	if len(transport.TLSClientConfig.Certificates) > 0 || transport.TLSClientConfig.RootCAs != nil {
		return true
	}
	// It may be possible that transport.TLSClientConfig is &tls.Config{}. In this case
	// we still treat it as mTLS not configured.
	return false
}

// SetTLSAwareBaseURL sets the base URL for current request. Relative URLs will be based on this base URL.
// If the client is built with TLS certs, http scheme will be changed to https automatically.
//
//	resp := client.LR().
//		SetTLSAwareBaseURL("http://myjeeva.com").
//		Get("/foo")
func (lReq *LazyRequest) SetTLSAwareBaseURL(baseURL string) *LazyRequest {
	// Rewrite http URL to https if TLS certificate is specified.
	if isMTLSConfigured(lReq.transport) && strings.HasPrefix(baseURL, "http://") {
		baseURL = "https://" + baseURL[len("http://"):]
	}
	lReq.opsC = append(lReq.opsC, func(c *resty.Client) {
		c.SetHostURL(baseURL)
	})
	return lReq
}

// Send method lazily send the HTTP request using the method and URL already defined
// for current LazyRequest.
//
//	 	resp := client.LR().
//	 		SetMethod("GET").
//				SetURL("http://httpbin.org/get").
//				Send()
func (lReq *LazyRequest) Send() *LazyResponse {
	return newResponse(lReq.Clone())
}

// Execute lazily sends the HTTP request with given HTTP method and URL
// for current LazyRequest.
//
//	resp := client.LR().
//		Execute("GET", "http://httpbin.org/get")
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
