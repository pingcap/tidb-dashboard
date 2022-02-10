// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package rest

import (
	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/util/jsonserde/ginadapter"
)

func AppendError(c *gin.Context, err error) {
	_ = c.Error(errorx.EnsureStackTrace(err))
}

func Render(c *gin.Context, code int, obj interface{}) {
	c.Render(code, ginadapter.Renderer{Data: obj})
}

func MustBind(c *gin.Context, obj interface{}) bool {
	if err := c.ShouldBindWith(obj, ginadapter.Binding); err != nil {
		AppendError(c, ErrBadRequest.WrapWithNoMessage(err))
		return false
	}
	return true
}
