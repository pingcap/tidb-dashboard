// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package rest

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/joomcode/errorx"
	"github.com/stretchr/testify/require"
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
		{http.StatusInternalServerError, et.NewWithNoMessage()},
		{http.StatusInternalServerError, et.WrapWithNoMessage(ErrBadRequest.NewWithNoMessage())},
		{http.StatusBadGateway, et.NewWithNoMessage().WithProperty(HTTPCodeProperty(http.StatusBadGateway))},
		{http.StatusConflict, ErrBadRequest.NewWithNoMessage().WithProperty(HTTPCodeProperty(http.StatusConflict))},
	}
	for _, tt := range tests {
		require.Equal(t, tt.want, extractHTTPCodeFromError(tt.args))
	}
}
