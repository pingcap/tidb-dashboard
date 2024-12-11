// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package rest

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
	"go.uber.org/atomic"

	"github.com/pingcap/tidb-dashboard/util/assertutil"
)

func TestExtractHTTPCodeFromError(t *testing.T) {
	ns := errorx.NewNamespace("ns")
	et := ns.NewType("err1")

	tests := []struct {
		want int
		args error
	}{
		{http.StatusOK, nil},
		{http.StatusInternalServerError, fmt.Errorf("foo")},
		{http.StatusBadRequest, ErrBadRequest.NewWithNoMessage()},
		{http.StatusBadRequest, ErrBadRequest.WrapWithNoMessage(fmt.Errorf("foo"))},
		{http.StatusBadRequest, errorx.Decorate(ErrBadRequest.NewWithNoMessage(), "parameter foo is invalid")},
		{http.StatusInternalServerError, et.NewWithNoMessage()},
		{http.StatusInternalServerError, et.WrapWithNoMessage(ErrBadRequest.NewWithNoMessage())},
		{http.StatusBadGateway, et.NewWithNoMessage().WithProperty(HTTPCodeProperty(http.StatusBadGateway))},
		{http.StatusConflict, ErrBadRequest.NewWithNoMessage().WithProperty(HTTPCodeProperty(http.StatusConflict))},
	}
	for _, tt := range tests {
		require.Equal(t, tt.want, extractHTTPCodeFromError(tt.args))
	}
}

type ErrorHandlerFnTestSuite struct {
	suite.Suite
}

func (suite *ErrorHandlerFnTestSuite) TestNoError() {
	engine := gin.New()
	engine.Use(ErrorHandlerFn())
	engine.GET("/test", func(c *gin.Context) {
		OK(c, gin.H{
			"foo": "bar",
		})
	})

	r := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/foo/", nil)
	engine.ServeHTTP(r, req)
	suite.Require().Equal(http.StatusNotFound, r.Code)

	r = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/test", nil)
	engine.ServeHTTP(r, req)
	suite.Require().Equal(http.StatusOK, r.Code)
	suite.Require().JSONEq(`{"foo":"bar"}`, r.Body.String())
}

func (suite *ErrorHandlerFnTestSuite) TestNormalError() {
	engine := gin.New()
	engine.Use(ErrorHandlerFn())
	engine.GET("/test", func(c *gin.Context) {
		Error(c, fmt.Errorf("some error"))
	})

	r := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	engine.ServeHTTP(r, req)
	suite.Require().Equal(http.StatusInternalServerError, r.Code)
	assertutil.RequireJSONContains(suite.T(), r.Body.String(), `{"error":true,"message":"some error","code":"common.internal"}`)
}

func (suite *ErrorHandlerFnTestSuite) TestBuiltinError() {
	engine := gin.New()
	engine.Use(ErrorHandlerFn())
	engine.GET("/test", func(c *gin.Context) {
		Error(c, ErrBadRequest.NewWithNoMessage())
	})

	r := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	engine.ServeHTTP(r, req)
	suite.Require().Equal(http.StatusBadRequest, r.Code)
	assertutil.RequireJSONContains(suite.T(), r.Body.String(), `{"error":true,"message":"common.bad_request","code":"common.bad_request"}`)
}

func (suite *ErrorHandlerFnTestSuite) TestOverrideStatusCode() {
	engine := gin.New()
	engine.Use(ErrorHandlerFn())
	engine.GET("/test", func(c *gin.Context) {
		Error(c, ErrBadRequest.NewWithNoMessage())
		c.Status(http.StatusBadGateway)
	})

	r := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	engine.ServeHTTP(r, req)
	suite.Require().Equal(http.StatusBadGateway, r.Code)
	assertutil.RequireJSONContains(suite.T(), r.Body.String(), `{"error":true,"message":"common.bad_request","code":"common.bad_request"}`)
}

func (suite *ErrorHandlerFnTestSuite) TestResponseAfterError() {
	engine := gin.New()
	engine.Use(ErrorHandlerFn())
	engine.GET("/test", func(c *gin.Context) {
		Error(c, ErrBadRequest.NewWithNoMessage())
		// If normal response is returned, no error message will be generated
		c.String(http.StatusNotFound, "foobar")
	})

	r := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	engine.ServeHTTP(r, req)
	suite.Require().Equal(http.StatusNotFound, r.Code)
	suite.Require().Equal(`foobar`, r.Body.String())
}

func (suite *ErrorHandlerFnTestSuite) TestNextMiddleware() {
	middlewareCalled := atomic.NewBool(false)

	engine := gin.New()
	engine.Use(ErrorHandlerFn())
	engine.Use(func(c *gin.Context) {
		// Middleware after the ErrorHandlerFn is called even if error is returned,
		// as ErrorHandlerFn handles errors after processing the request
		c.Next()
		middlewareCalled.Store(true)
	})
	engine.GET("/test", func(c *gin.Context) {
		Error(c, ErrBadRequest.NewWithNoMessage())
	})

	r := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	engine.ServeHTTP(r, req)
	suite.Require().Equal(http.StatusBadRequest, r.Code)
	suite.Require().True(middlewareCalled.Load())
}

// When panic happened, ErrorHandlerFn will not be invoked.
func (suite *ErrorHandlerFnTestSuite) TestWithRecoveryMiddleware() {
	engine := gin.New()
	engine.Use(gin.Recovery())
	engine.Use(ErrorHandlerFn())
	engine.GET("/test", func(_ *gin.Context) {
		panic("some panic")
	})

	r := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	engine.ServeHTTP(r, req)
	suite.Require().Equal(http.StatusInternalServerError, r.Code)
	suite.Require().Equal("", r.Body.String())
}

func TestErrorHandlerFn(t *testing.T) {
	suite.Run(t, &ErrorHandlerFnTestSuite{})
}
