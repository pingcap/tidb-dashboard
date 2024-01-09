// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package rest

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/joomcode/errorx"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/testutil/gintest"
)

func TestError(t *testing.T) {
	c, r := gintest.CtxGet(nil)
	Error(c, fmt.Errorf("my error"))
	require.Len(t, c.Errors, 1)
	require.EqualError(t, c.Errors[0].Err, "my error")
	require.Empty(t, r.Body.String())
}

func TestJSON(t *testing.T) {
	c, r := gintest.CtxGet(nil)
	JSON(c, http.StatusBadRequest, "foo")
	require.Empty(t, c.Errors)
	require.Equal(t, http.StatusBadRequest, r.Code)
	require.Equal(t, `"foo"`, r.Body.String())

	type example struct {
		FooBar string
	}
	c, r = gintest.CtxGet(nil)
	JSON(c, http.StatusOK, example{FooBar: "value"})
	require.Empty(t, c.Errors)
	require.Equal(t, http.StatusOK, r.Code)
	require.Equal(t, `{"foo_bar":"value"}`, r.Body.String())
}

func TestMustBind(t *testing.T) {
	c, r := gintest.CtxPost(nil, `"abc"`)

	var v string
	bindResult := MustBind(c, &v)
	require.True(t, bindResult)
	require.Equal(t, "abc", v)
	require.Empty(t, c.Errors)
	require.Empty(t, r.Body.String())

	c, r = gintest.CtxPost(nil, `123`)
	bindResult = MustBind(c, &v)
	require.False(t, bindResult)
	require.Len(t, c.Errors, 1)
	require.Error(t, c.Errors[0].Err)
	require.True(t, errorx.IsOfType(c.Errors[0].Err, ErrBadRequest))
	require.Empty(t, r.Body.String())
}

func TestOK(t *testing.T) {
	c, r := gintest.CtxGet(nil)
	OK(c, "xyz")
	require.Empty(t, c.Errors)
	require.Equal(t, http.StatusOK, r.Code)
	require.Equal(t, `"xyz"`, r.Body.String())
}
