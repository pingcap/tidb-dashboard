// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package pd

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
	"go.uber.org/fx/fxtest"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
)

func newTestClient(t *testing.T) *Client {
	lc := fxtest.NewLifecycle(t)
	config := &config.Config{}
	c := NewPDClient(lc, httpc.NewHTTPClient(lc, config), config)
	c.lifecycleCtx = context.Background()
	return c
}

func Test_AddRequestHeader_returnDifferentHTTPClient(t *testing.T) {
	c := newTestClient(t)
	cc := c.AddRequestHeader("1", "11")

	require.NotSame(t, c.httpClient, cc.httpClient)
}

func Test_Get_withHeader(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(r.Header.Get("1")))
	}))
	defer ts.Close()

	c := newTestClient(t).WithBaseURL(ts.URL)
	resp1, _ := c.Get("")
	d1, _ := resp1.Body()
	require.Equal(t, "", string(d1))

	cc := c.AddRequestHeader("1", "11")
	resp2, _ := cc.Get("")
	d2, _ := resp2.Body()
	require.Equal(t, "11", string(d2))

	resp3, _ := c.Get("")
	d3, _ := resp3.Body()
	require.Equal(t, "", string(d3))
}
