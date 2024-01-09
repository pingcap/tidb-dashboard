// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package rest

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/util/jsonserde/ginadapter"
)

// Error appends an error to the context, which will later becomes an error message returned to the client.
// You should not write any other body to the client before or after calling this function.
// Otherwise there will be no error message written to the client.
// See `ErrorHandlerFn` for more details.
func Error(c *gin.Context, err error) {
	// For security reasons, we need to hide detailed stacktrace info.
	_ = c.Error(err) // before: c.Error(errorx.EnsureStackTrace(err))
}

// JSON writes a JSON string to the client with the given status code.
// The key of te `obj` will be serialized in snake_case by default (see `jsonserde` package).
func JSON(c *gin.Context, code int, obj interface{}) {
	c.Render(code, ginadapter.Renderer{Data: obj})
}

// OK writes a JSON string to the client with the status code 200.
// The key of te `obj` will be serialized in snake_case by default (see `jsonserde` package).
func OK(c *gin.Context, obj interface{}) {
	JSON(c, http.StatusOK, obj)
}

// MustBind decodes the request body to the passed struct pointer.
// If error occurs, `ErrBadRequest` will be recorded in the context and `false` will be returned. You should early
// return the handler in this case.
func MustBind(c *gin.Context, obj interface{}) bool {
	if err := c.ShouldBindWith(obj, ginadapter.Binding); err != nil {
		Error(c, ErrBadRequest.WrapWithNoMessage(err))
		return false
	}
	return true
}
