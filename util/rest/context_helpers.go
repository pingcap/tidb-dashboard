// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package rest

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/util/jsonserde/ginadapter"
)

func Error(c *gin.Context, err error) {
	_ = c.Error(errorx.EnsureStackTrace(err))
}

func OK(c *gin.Context, obj interface{}) {
	c.Render(http.StatusOK, ginadapter.Renderer{Data: obj})
}

func MustBind(c *gin.Context, obj interface{}) bool {
	if err := c.ShouldBindWith(obj, ginadapter.Binding); err != nil {
		Error(c, ErrBadRequest.WrapWithNoMessage(err))
		return false
	}
	return true
}
