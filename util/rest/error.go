// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package rest

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.uber.org/zap"
)

var (
	ErrUnauthenticated = errorx.CommonErrors.NewType("unauthenticated")
	ErrForbidden       = errorx.CommonErrors.NewType("forbidden")
	ErrBadRequest      = errorx.CommonErrors.NewType("bad_request")
	ErrNotFound        = errorx.CommonErrors.NewType("not_found")

	errInternal  = errorx.CommonErrors.NewType("internal")
	propHTTPCode = errorx.RegisterProperty("http_code")
)

func HTTPCodeProperty(code int) (errorx.Property, int) {
	return propHTTPCode, code
}

func extractHTTPCodeFromError(err error) int {
	if err == nil {
		return http.StatusOK
	}

	ex := errorx.Cast(err)
	if ex == nil {
		return http.StatusInternalServerError
	}

	// If there is a Status Code property inside, take it.
	v, ok := ex.Property(propHTTPCode)
	if ok {
		return v.(int)
	}

	// Is it a well-known error type?
	if ex.IsOfType(ErrUnauthenticated) {
		// See https://stackoverflow.com/questions/3297048/403-forbidden-vs-401-unauthorized-http-responses
		// for why StatusUnauthorized comes from ErrUnauthenticated
		return http.StatusUnauthorized
	}
	if ex.IsOfType(ErrForbidden) {
		return http.StatusForbidden
	}
	if ex.IsOfType(ErrBadRequest) {
		return http.StatusBadRequest
	}
	if ex.IsOfType(ErrNotFound) {
		return http.StatusNotFound
	}

	return http.StatusInternalServerError
}

// ErrorHandlerFn creates a handler func that turns (last) error in the context into an APIError json response.
// In handlers, `rest.Error(c, err)` can be used to attach the error to the context.
// When error is attached in the context:
// - The handler can optionally assign the HTTP status code.
// - The handler must not self-generate a response body.
func ErrorHandlerFn() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		err := c.Errors.Last()
		if err == nil {
			return
		}

		if c.Writer.Size() > 0 {
			return
		}

		statusCode := c.Writer.Status()
		if statusCode == http.StatusOK {
			// Change the status code if it is not specified.
			statusCode = extractHTTPCodeFromError(err.Err)
		}

		errResponse := NewErrorResponse(err.Err)

		log.Warn("Error when handling request",
			zap.String("uri", c.Request.RequestURI),
			zap.String("remoteAddr", c.Request.RemoteAddr),
			zap.String("errorFullText", errResponse.FullText))
		c.AbortWithStatusJSON(statusCode, errResponse)
	}
}
