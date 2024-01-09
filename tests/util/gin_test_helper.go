// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package util

import (
	"net/http"
	"net/http/httptest"

	"github.com/gin-gonic/gin"
)

func TestReqWithHandlers(req *http.Request, handlers ...gin.HandlerFunc) (*gin.Context, *httptest.ResponseRecorder) {
	w := httptest.NewRecorder()
	c, e := gin.CreateTestContext(w)
	c.Request = req
	e.Handle(req.Method, req.URL.Path, handlers...)
	e.HandleContext(c)
	return c, w
}
