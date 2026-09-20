// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package httpc

import (
	"context"
	"crypto/tls"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
	"go.uber.org/fx/fxtest"

	"github.com/pingcap/tidb-dashboard/pkg/config"
)

func newTestClient(t *testing.T) *Client {
	lc := fxtest.NewLifecycle(t)
	config := &config.Config{}
	return NewHTTPClient(lc, config)
}

func Test_Clone(t *testing.T) {
	c := newTestClient(t)
	cc := c.Clone()

	require.NotSame(t, c, cc)

	require.Nil(t, c.header)
	require.Nil(t, cc.header)
}

func Test_CloneAndAddRequestHeader(t *testing.T) {
	c := newTestClient(t)
	cc := c.CloneAndAddRequestHeader("1", "11")

	require.Nil(t, c.header)
	require.Equal(t, "11", cc.header.Get("1"))

	cc2 := cc.CloneAndAddRequestHeader("2", "22")
	require.Equal(t, "11", cc.header.Get("1"))
	require.Equal(t, "", cc.header.Get("2"))
	require.Equal(t, "11", cc2.header.Get("1"))
	require.Equal(t, "22", cc2.header.Get("2"))
}

func Test_Send_withHeader(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(r.Header.Get("1")))
	}))
	defer ts.Close()

	c := newTestClient(t)
	resp1, _ := c.Send(context.Background(), ts.URL, http.MethodGet, nil, nil, "")
	d1, _ := resp1.Body()
	require.Equal(t, "", string(d1))

	cc := c.CloneAndAddRequestHeader("1", "11")
	resp2, _ := cc.Send(context.Background(), ts.URL, http.MethodGet, nil, nil, "")
	d2, _ := resp2.Body()
	require.Equal(t, "11", string(d2))

	resp3, _ := c.Send(context.Background(), ts.URL, http.MethodGet, nil, nil, "")
	d3, _ := resp3.Body()
	require.Equal(t, "", string(d3))
}

func Test_Send_overHTTP2(t *testing.T) {
	ts := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, 2, r.ProtoMajor)
		_, _ = w.Write([]byte("ok"))
	}))
	ts.EnableHTTP2 = true
	ts.StartTLS()
	defer ts.Close()

	lc := fxtest.NewLifecycle(t)
	c := NewHTTPClient(lc, &config.Config{
		ClusterTLSConfig: &tls.Config{InsecureSkipVerify: true}, //nolint:gosec
	})

	resp, err := c.Send(context.Background(), ts.URL, http.MethodGet, nil, nil, "")
	require.NoError(t, err)
	body, err := resp.Body()
	require.NoError(t, err)
	require.Equal(t, "ok", string(body))
}
