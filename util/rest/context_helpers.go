// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package rest

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/util/jsonserde/ginadapter"
)

// TODO: Add tests
func Error(c *gin.Context, err error) {
	_ = c.Error(errorx.EnsureStackTrace(err))
}

// TODO: Add tests
func JSON(c *gin.Context, code int, obj interface{}) {
	c.Render(code, ginadapter.Renderer{Data: obj})
}

// TODO: Add tests
func OK(c *gin.Context, obj interface{}) {
	JSON(c, http.StatusOK, obj)
}

// TODO: Add tests
func MustBind(c *gin.Context, obj interface{}) bool {
	if err := c.ShouldBindWith(obj, ginadapter.Binding); err != nil {
		Error(c, ErrBadRequest.WrapWithNoMessage(err))
		return false
	}
	return true
}
