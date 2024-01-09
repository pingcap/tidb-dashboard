// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package ginadapter

import (
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRenderer(t *testing.T) {
	w := httptest.NewRecorder()
	type User struct {
		FullName string
		Age      int
	}
	data := User{
		FullName: "zoo",
		Age:      18,
	}

	err := (Renderer{data}).Render(w)

	require.NoError(t, err)
	require.Equal(t, `{"full_name":"zoo","age":18}`, w.Body.String())
	require.Equal(t, `application/json; charset=utf-8`, w.Header().Get("Content-Type"))
}

func TestRendererError(t *testing.T) {
	w := httptest.NewRecorder()
	data := make(chan int)

	err := (Renderer{data}).Render(w)
	require.EqualError(t, err, "chan int is unsupported type")
}
