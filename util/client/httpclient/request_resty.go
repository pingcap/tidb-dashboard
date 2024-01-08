// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

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

// SetHeader method is to set a single header field and its value in the current request.
//
// For Example: To set `Content-Type` and `Accept` as `application/json`.
//
//	client.LR().
//		SetHeader("Content-Type", "application/json").
//		SetHeader("Accept", "application/json")
//
// Also you can override header value, which was set at client instance level.
func (lReq *LazyRequest) SetHeader(header, value string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetHeader(header, value)
	})
	return lReq
}

// SetHeaders method sets multiple headers field and its values at one go in the current request.
//
// For Example: To set `Content-Type` and `Accept` as `application/json`
//
//	client.LR().
//		SetHeaders(map[string]string{
//			"Content-Type": "application/json",
//			"Accept": "application/json",
//		})
//
// Also you can override header value, which was set at client instance level.
func (lReq *LazyRequest) SetHeaders(headers map[string]string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetHeaders(headers)
	})
	return lReq
}

// SetHeaderVerbatim method is to set a single header field and its value verbatim in the current request.
//
// For Example: To set `all_lowercase` and `UPPERCASE` as `available`.
//
//	client.LR().
//		SetHeaderVerbatim("all_lowercase", "available").
//		SetHeaderVerbatim("UPPERCASE", "available")
//
// Also you can override header value, which was set at client instance level.
func (lReq *LazyRequest) SetHeaderVerbatim(header, value string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetHeaderVerbatim(header, value)
	})
	return lReq
}

// SetQueryParam method sets single parameter and its value in the current request.
// It will be formed as query string for the request.
//
// For Example: `search=kitchen%20papers&size=large` in the URL after `?` mark.
//
//	client.LR().
//		SetQueryParam("search", "kitchen papers").
//		SetQueryParam("size", "large")
//
// Also you can override query params value, which was set at client instance level.
func (lReq *LazyRequest) SetQueryParam(param, value string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetQueryParam(param, value)
	})
	return lReq
}

// SetQueryParams method sets multiple parameters and its values at one go in the current request.
// It will be formed as query string for the request.
//
// For Example: `search=kitchen%20papers&size=large` in the URL after `?` mark.
//
//	client.LR().
//		SetQueryParams(map[string]string{
//			"search": "kitchen papers",
//			"size": "large",
//		})
//
// Also you can override query params value, which was set at client instance level.
func (lReq *LazyRequest) SetQueryParams(params map[string]string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetQueryParams(params)
	})
	return lReq
}

// SetQueryParamsFromValues method appends multiple parameters with multi-value
// (`url.Values`) at one go in the current request. It will be formed as
// query string for the request.
//
// For Example: `status=pending&status=approved&status=open` in the URL after `?` mark.
//
//	client.LR().
//		SetQueryParamsFromValues(url.Values{
//			"status": []string{"pending", "approved", "open"},
//		})
//
// Also you can override query params value, which was set at client instance level.
func (lReq *LazyRequest) SetQueryParamsFromValues(params url.Values) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetQueryParamsFromValues(params)
	})
	return lReq
}

// SetQueryString method provides ability to use string as an input to set URL query string for the request.
//
// Using String as an input
//
//	client.LR().
//		SetQueryString("productId=232&template=fresh-sample&cat=resty&source=google&kw=buy a lot more")
func (lReq *LazyRequest) SetQueryString(query string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetQueryString(query)
	})
	return lReq
}

// SetFormData method sets Form parameters and their values in the current request.
// It's applicable only HTTP method `POST` and `PUT` and requests content type would be set as
// `application/x-www-form-urlencoded`.
//
//	client.LR().
//		SetFormData(map[string]string{
//			"access_token": "BC594900-518B-4F7E-AC75-BD37F019E08F",
//			"user_id": "3455454545",
//		})
//
// Also you can override form data value, which was set at client instance level.
func (lReq *LazyRequest) SetFormData(data map[string]string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetFormData(data)
	})
	return lReq
}

// SetFormDataFromValues method appends multiple form parameters with multi-value
// (`url.Values`) at one go in the current request.
//
//	client.LR().
//		SetFormDataFromValues(url.Values{
//			"search_criteria": []string{"book", "glass", "pencil"},
//		})
//
// Also you can override form data value, which was set at client instance level.
func (lReq *LazyRequest) SetFormDataFromValues(data url.Values) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetFormDataFromValues(data)
	})
	return lReq
}

// SetBody method sets the request body for the request. It supports various realtime needs as easy.
// We can say its quite handy or powerful. Supported request body data types is `string`,
// `[]byte`, `struct`, `map`, `slice` and `io.Reader`. Body value can be pointer or non-pointer.
// Automatic marshalling for JSON and XML content type, if it is `struct`, `map`, or `slice`.
//
// Note: `io.Reader` is processed as bufferless mode while sending request.
//
// For Example: Struct as a body input, based on content type, it will be marshalled.
//
//	client.LR().
//		SetBody(User{
//			Username: "jeeva@myjeeva.com",
//			Password: "welcome2resty",
//		})
//
// Map as a body input, based on content type, it will be marshalled.
//
//	client.LR().
//		SetBody(map[string]interface{}{
//			"username": "jeeva@myjeeva.com",
//			"password": "welcome2resty",
//			"address": &Address{
//				Address1: "1111 This is my street",
//				Address2: "Apt 201",
//				City: "My City",
//				State: "My State",
//				ZipCode: 00000,
//			},
//		})
//
// String as a body input. Suitable for any need as a string input.
//
//	client.LR().
//		SetBody(`{
//			"username": "jeeva@getrightcare.com",
//			"password": "admin"
//		}`)
//
// []byte as a body input. Suitable for raw request such as file upload, serialize & deserialize, etc.
//
//	client.LR().
//		SetBody([]byte("This is my raw request, sent as-is"))
func (lReq *LazyRequest) SetBody(body interface{}) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetBody(body)
	})
	return lReq
}

// Deprecated: This usage is intentionally not supported.
func (lReq *LazyRequest) SetResult() {
	panic("do not use this in LazyRequest")
}

// Deprecated: This usage is intentionally not supported.
func (lReq *LazyRequest) SetError() {
	panic("do not use this in LazyRequest")
}

// SetFile method is to set single file field name and its path for multipart upload.
//
//	client.LR().
//		SetFile("my_file", "/Users/jeeva/Gas Bill - Sep.pdf")
func (lReq *LazyRequest) SetFile(param, filePath string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetFile(param, filePath)
	})
	return lReq
}

// SetFiles method is to set multiple file field name and its path for multipart upload.
//
//	client.LR().
//		SetFiles(map[string]string{
//				"my_file1": "/Users/jeeva/Gas Bill - Sep.pdf",
//				"my_file2": "/Users/jeeva/Electricity Bill - Sep.pdf",
//				"my_file3": "/Users/jeeva/Water Bill - Sep.pdf",
//			})
func (lReq *LazyRequest) SetFiles(files map[string]string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetFiles(files)
	})
	return lReq
}

// SetFileReader method is to set single file using io.Reader for multipart upload.
//
//	client.LR().
//		SetFileReader("profile_img", "my-profile-img.png", bytes.NewReader(profileImgBytes)).
//		SetFileReader("notes", "user-notes.txt", bytes.NewReader(notesBytes))
func (lReq *LazyRequest) SetFileReader(param, fileName string, reader io.Reader) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetFileReader(param, fileName, reader)
	})
	return lReq
}

// SetMultipartFormData method allows simple form data to be attached to the request as `multipart:form-data`.
func (lReq *LazyRequest) SetMultipartFormData(data map[string]string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetMultipartFormData(data)
	})
	return lReq
}

// SetMultipartField method is to set custom data using io.Reader for multipart upload.
func (lReq *LazyRequest) SetMultipartField(param, fileName, contentType string, reader io.Reader) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetMultipartField(param, fileName, contentType, reader)
	})
	return lReq
}

// SetMultipartFields method is to set multiple data fields using io.Reader for multipart upload.
//
// For Example:
//
//	client.LR().SetMultipartFields(
//		&resty.MultipartField{
//			Param:       "uploadManifest1",
//			FileName:    "upload-file-1.json",
//			ContentType: "application/json",
//			Reader:      strings.NewReader(`{"input": {"name": "Uploaded document 1", "_filename" : ["file1.txt"]}}`),
//		},
//		&resty.MultipartField{
//			Param:       "uploadManifest2",
//			FileName:    "upload-file-2.json",
//			ContentType: "application/json",
//			Reader:      strings.NewReader(`{"input": {"name": "Uploaded document 2", "_filename" : ["file2.txt"]}}`),
//		})
//
// If you have slice already, then simply call-
//
//	client.LR().SetMultipartFields(fields...)
func (lReq *LazyRequest) SetMultipartFields(fields ...*resty.MultipartField) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetMultipartFields(fields...)
	})
	return lReq
}

// SetContentLength method sets the HTTP header `Content-Length` value for current request.
// By default Resty won't set `Content-Length`. Also you have an option to enable for every
// request.
func (lReq *LazyRequest) SetContentLength(l bool) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetContentLength(l)
	})
	return lReq
}

// SetBasicAuth method sets the basic authentication header in the current HTTP request.
//
// For Example:
//
//	Authorization: Basic <base64-encoded-value>
//
// To set the header for username "go-resty" and password "welcome"
//
//	client.LR().SetBasicAuth("go-resty", "welcome")
//
// This method overrides the credentials set by method `Client.SetBasicAuth`.
func (lReq *LazyRequest) SetBasicAuth(username, password string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetBasicAuth(username, password)
	})
	return lReq
}

// SetAuthToken method sets the auth token header(Default Scheme: Bearer) in the current HTTP request. Header example:
//
//	Authorization: Bearer <auth-token-value-comes-here>
//
// For Example: To set auth token BC594900518B4F7EAC75BD37F019E08FBC594900518B4F7EAC75BD37F019E08F
//
//	client.LR().SetAuthToken("BC594900518B4F7EAC75BD37F019E08FBC594900518B4F7EAC75BD37F019E08F")
//
// This method overrides the Auth token set by method `Client.SetAuthToken`.
func (lReq *LazyRequest) SetAuthToken(token string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetAuthToken(token)
	})
	return lReq
}

// SetAuthScheme method sets the auth token scheme type in the HTTP request. For Example:
//
//	Authorization: <auth-scheme-value-set-here> <auth-token-value>
//
// For Example: To set the scheme to use OAuth
//
//	client.LR().SetAuthScheme("OAuth")
//
// This auth header scheme gets added to all the request rasied from this client instance.
// Also it can be overridden or set one at the request level is supported.
//
// Information about Auth schemes can be found in RFC7235 which is linked to below along with the page containing
// the currently defined official authentication schemes:
//
//	https://tools.ietf.org/html/rfc7235
//	https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml#authschemes
//
// This method overrides the Authorization scheme set by method `Client.SetAuthScheme`.
func (lReq *LazyRequest) SetAuthScheme(scheme string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetAuthScheme(scheme)
	})
	return lReq
}

// Deprecated: This usage is intentionally not supported.
func (lReq *LazyRequest) SetOutput() {
	panic("do not use this in LazyRequest")
}

// SetSRV method sets the details to query the service SRV record and execute the
// request.
//
//	client.LR().
//		SetSRV(SRVRecord{"web", "testservice.com"}).
//		Get("/get")
func (lReq *LazyRequest) SetSRV(srv *resty.SRVRecord) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetSRV(srv)
	})
	return lReq
}

// Deprecated: This usage is intentionally not supported.
func (lReq *LazyRequest) SetDoNotParseResponse() {
	panic("do not use this in LazyRequest")
}

// SetPathParam method sets single URL path key-value pair in the
// Resty current request instance.
//
//	client.LR().SetPathParam("userId", "sample@sample.com")
//
//	Result:
//	   URL - /v1/users/{userId}/details
//	   Composed URL - /v1/users/sample@sample.com/details
//
// It replaces the value of the key while composing the request URL. Also you can
// override Path Params value, which was set at client instance level.
func (lReq *LazyRequest) SetPathParam(param, value string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetPathParam(param, value)
	})
	return lReq
}

// SetPathParams method sets multiple URL path key-value pairs at one go in the
// Resty current request instance.
//
//	client.LR().SetPathParams(map[string]string{
//	   "userId": "sample@sample.com",
//	   "subAccountId": "100002",
//	})
//
//	Result:
//	   URL - /v1/users/{userId}/{subAccountId}/details
//	   Composed URL - /v1/users/sample@sample.com/100002/details
//
// It replaces the value of the key while composing request URL. Also you can
// override Path Params value, which was set at client instance level.
func (lReq *LazyRequest) SetPathParams(params map[string]string) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetPathParams(params)
	})
	return lReq
}

// Deprecated: This usage is intentionally not supported.
func (lReq *LazyRequest) ExpectContentType() {
	panic("do not use this in LazyRequest")
}

// Deprecated: This usage is intentionally not supported.
func (lReq *LazyRequest) ForceContentType() {
	panic("do not use this in LazyRequest")
}

// SetJSONEscapeHTML method is to enable/disable the HTML escape on JSON marshal.
//
// Note: This option only applicable to standard JSON Marshaller.
func (lReq *LazyRequest) SetJSONEscapeHTML(b bool) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetJSONEscapeHTML(b)
	})
	return lReq
}

// SetCookie method appends a single cookie in the current request instance.
//
//	client.LR().SetCookie(&http.Cookie{
//		Name:"go-resty",
//		Value:"This is cookie value",
//	})
//
// Note: Method appends the Cookie value into existing Cookie if already existing.
func (lReq *LazyRequest) SetCookie(hc *http.Cookie) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetCookie(hc)
	})
	return lReq
}

// SetCookies method sets an array of cookies in the current request instance.
//
//	cookies := []*http.Cookie{
//		&http.Cookie{
//			Name:"go-resty-1",
//			Value:"This is cookie 1 value",
//		},
//		&http.Cookie{
//			Name:"go-resty-2",
//			Value:"This is cookie 2 value",
//		},
//	}
//
//	// Setting a cookies into resty's current request
//	client.LR().SetCookies(cookies)
//
// Note: Method appends the Cookie value into existing Cookie if already existing.
func (lReq *LazyRequest) SetCookies(rs []*http.Cookie) *LazyRequest {
	lReq.opsR = append(lReq.opsR, func(r *resty.Request) {
		r.SetCookies(rs)
	})
	return lReq
}
