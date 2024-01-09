// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package gintest

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"net/url"

	"github.com/gin-gonic/gin"
)

func CtxGet(queryParams url.Values) (c *gin.Context, r *httptest.ResponseRecorder) {
	r = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(r)
	u := "/"
	if queryParams != nil {
		u = "/?" + queryParams.Encode()
	}
	c.Request, _ = http.NewRequest(http.MethodGet, u, nil)
	return
}

func CtxPost(queryParams url.Values, postBody string) (c *gin.Context, r *httptest.ResponseRecorder) {
	r = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(r)
	u := "/"
	if queryParams != nil {
		u = "/?" + queryParams.Encode()
	}
	c.Request, _ = http.NewRequest(http.MethodPost, u, bytes.NewBuffer([]byte(postBody)))
	return
}
