// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package httpclient

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSetHeader(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = fmt.Fprintln(w, r.Header.Get("X-Test"))
	}))
	defer ts.Close()

	client := New(Config{})
	client.SetHeader("X-Test", "foobar")
	cancel, resp, err := client.LifecycleR().Get(ts.URL)
	defer cancel()
	require.Nil(t, err)
	require.NotNil(t, resp)
	require.Equal(t, http.StatusOK, resp.StatusCode())
	require.Equal(t, "foobar", resp.String())
}

func TestSetBaseURL(t *testing.T) {
	ts1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = fmt.Fprintln(w, "ts1"+r.URL.Path)
	}))
	defer ts1.Close()

	ts2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = fmt.Fprintln(w, "ts2"+r.URL.Path)
	}))
	defer ts2.Close()

	client := New(Config{
		BaseURL: ts1.URL,
	})
	cancel, resp, err := client.LifecycleR().Get("/foo")
	defer cancel()
	require.Nil(t, err)
	require.NotNil(t, resp)
	require.Equal(t, http.StatusOK, resp.StatusCode())
	require.Equal(t, "ts1/foo", resp.String())

	cancel, resp, err = client.LifecycleR().Get(ts2.URL) // BaseURL can be overwritten
	defer cancel()
	require.Nil(t, err)
	require.NotNil(t, resp)
	require.Equal(t, http.StatusOK, resp.StatusCode())
	require.Equal(t, "ts2/", resp.String())
}
