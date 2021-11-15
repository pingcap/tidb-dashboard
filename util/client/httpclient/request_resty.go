// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

// Copyright (c) 2015-2021 Jeevanandam M (jeeva@myjeeva.com), All rights reserved.
// resty source code and usage is governed by a MIT style
// license that can be found in the LICENSE file.

// This file only contains encapsulated functions implemented over resty.Request

package httpclient

import (
	"io"
	"net/http"
	"net/url"

	"github.com/go-resty/resty/v2"
)

func (r *Request) SetHeader(header, value string) *Request {
	r.inner.SetHeader(header, value)
	return r
}

func (r *Request) SetHeaders(headers map[string]string) *Request {
	r.inner.SetHeaders(headers)
	return r
}

func (r *Request) SetHeaderVerbatim(header, value string) *Request {
	r.inner.SetHeaderVerbatim(header, value)
	return r
}

func (r *Request) SetQueryParam(param, value string) *Request {
	r.inner.SetQueryParam(param, value)
	return r
}

func (r *Request) SetQueryParams(params map[string]string) *Request {
	r.inner.SetQueryParams(params)
	return r
}

func (r *Request) SetQueryParamsFromValues(params url.Values) *Request {
	r.inner.SetQueryParamsFromValues(params)
	return r
}

func (r *Request) SetQueryString(query string) *Request {
	r.inner.SetQueryString(query)
	return r
}

func (r *Request) SetFormData(data map[string]string) *Request {
	r.inner.SetFormData(data)
	return r
}

func (r *Request) SetFormDataFromValues(data url.Values) *Request {
	r.inner.SetFormDataFromValues(data)
	return r
}

func (r *Request) SetBody(body interface{}) *Request {
	r.inner.SetBody(body)
	return r
}

// Note: This function is not safe to use and is deprecated. Use `Request.SetJSONResult()`.
// func (r *Request) SetResult(res interface{}) *Request {
// 	r.inner.SetResult(res)
// 	return r
// }

func (r *Request) SetError(err interface{}) *Request {
	r.inner.SetError(err)
	return r
}

func (r *Request) SetFile(param, filePath string) *Request {
	r.inner.SetFile(param, filePath)
	return r
}

func (r *Request) SetFiles(files map[string]string) *Request {
	r.inner.SetFiles(files)
	return r
}

func (r *Request) SetFileReader(param, fileName string, reader io.Reader) *Request {
	r.inner.SetFileReader(param, fileName, reader)
	return r
}

func (r *Request) SetMultipartFormData(data map[string]string) *Request {
	r.inner.SetMultipartFormData(data)
	return r
}

func (r *Request) SetMultipartField(param, fileName, contentType string, reader io.Reader) *Request {
	r.inner.SetMultipartField(param, fileName, contentType, reader)
	return r
}

func (r *Request) SetMultipartFields(fields ...*resty.MultipartField) *Request {
	r.inner.SetMultipartFields(fields...)
	return r
}

func (r *Request) SetContentLength(l bool) *Request {
	r.inner.SetContentLength(l)
	return r
}

func (r *Request) SetBasicAuth(username, password string) *Request {
	r.inner.SetBasicAuth(username, password)
	return r
}

func (r *Request) SetAuthToken(token string) *Request {
	r.inner.SetAuthToken(token)
	return r
}

func (r *Request) SetAuthScheme(scheme string) *Request {
	r.inner.SetAuthScheme(scheme)
	return r
}

func (r *Request) SetOutput(file string) *Request {
	r.inner.SetOutput(file)
	return r
}

func (r *Request) SetSRV(srv *resty.SRVRecord) *Request {
	r.inner.SetSRV(srv)
	return r
}

func (r *Request) SetDoNotParseResponse(parse bool) *Request {
	r.inner.SetDoNotParseResponse(parse)
	return r
}

func (r *Request) SetPathParam(param, value string) *Request {
	r.inner.SetPathParam(param, value)
	return r
}

func (r *Request) SetPathParams(params map[string]string) *Request {
	r.inner.SetPathParams(params)
	return r
}

func (r *Request) ExpectContentType(contentType string) *Request {
	r.inner.ExpectContentType(contentType)
	return r
}

func (r *Request) ForceContentType(contentType string) *Request {
	r.inner.ForceContentType(contentType)
	return r
}

func (r *Request) SetJSONEscapeHTML(b bool) *Request {
	r.inner.SetJSONEscapeHTML(b)
	return r
}

func (r *Request) SetCookie(hc *http.Cookie) *Request {
	r.inner.SetCookie(hc)
	return r
}

func (r *Request) SetCookies(rs []*http.Cookie) *Request {
	r.inner.SetCookies(rs)
	return r
}

func (r *Request) EnableTrace() *Request {
	r.inner.EnableTrace()
	return r
}

func (r *Request) TraceInfo() resty.TraceInfo {
	return r.inner.TraceInfo()
}
