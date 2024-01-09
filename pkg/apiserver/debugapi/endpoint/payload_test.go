// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package endpoint

import (
	"bytes"
	"context"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/go-resty/resty/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/client/tidbclient"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

func TestRequestPayloadResolver(t *testing.T) {
	clients := HTTPClients{
		TiDBStatusClient: tidbclient.NewStatusClient(httpclient.Config{}),
	}
	apis := []APIDefinition{
		{
			ID:        "one_pd_api",
			Component: topo.KindPD,
			Path:      "/foo",
			Method:    resty.MethodGet,
		},
		{
			ID:        "one_tidb_api",
			Component: topo.KindTiDB,
			Path:      "/test/{pathParam}",
			Method:    resty.MethodGet,
			PathParams: []APIParamDefinition{
				{
					Name:     "pathParam",
					Required: true,
				},
			},
			QueryParams: []APIParamDefinition{
				{
					Name:     "queryParam",
					Required: true,
				},
				{
					Name:     "queryParam2",
					Required: false,
				},
			},
		},
		{
			ID:        "another_tidb_api",
			Component: topo.KindTiDB,
			Path:      "/foo/{regionID}",
			Method:    resty.MethodGet,
			PathParams: []APIParamDefinition{
				{
					Name:     "regionID",
					Required: false,
				},
			},
			QueryParams: []APIParamDefinition{
				{
					Name:     "state",
					Required: false,
					OnResolve: func(value string) ([]string, error) {
						if value == "__INVALID__" {
							return nil, fmt.Errorf("invalid")
						}
						return []string{"a" + value + "b"}, nil
					},
				},
			},
		},
		{
			ID:        "one_tiflash_api",
			Component: topo.KindTiFlash,
			Path:      "/bar",
			Method:    resty.MethodGet,
		},
	}
	resolver := NewRequestPayloadResolver(apis, clients)

	// APIs without an accepted client will be ignored.
	{
		apis := resolver.ListAPIs()
		require.Len(t, apis, 2)
		require.Equal(t, "one_tidb_api", apis[0].ID)
		require.Equal(t, "another_tidb_api", apis[1].ID)
	}

	// Resolve
	resolved, err := resolver.ResolvePayload(RequestPayload{
		API:  "one_tidb_api",
		Host: "tidb-1.internal",
		Port: 12345,
		ParamValues: map[string]string{
			"pathParam":  "p1",
			"queryParam": "q1",
		},
	})
	require.Nil(t, err)
	require.Equal(t, resolved.api, &apis[1])
	require.Equal(t, "tidb-1.internal", resolved.host)
	require.Equal(t, 12345, resolved.port)
	require.Equal(t, "/test/p1", resolved.path)
	require.Equal(t, url.Values{"queryParam": []string{"q1"}}, resolved.queryValues)

	resolved, err = resolver.ResolvePayload(RequestPayload{
		API:  "another_tidb_api",
		Host: "tidb-1.internal",
		Port: 12345,
		ParamValues: map[string]string{
			"regionID": "35",
		},
	})
	require.Nil(t, err)
	require.Equal(t, resolved.api, &apis[2])
	require.Equal(t, "tidb-1.internal", resolved.host)
	require.Equal(t, 12345, resolved.port)
	require.Equal(t, "/foo/35", resolved.path)
	require.Equal(t, url.Values{}, resolved.queryValues)

	// Resolve unknown API endpoint
	resolved, err = resolver.ResolvePayload(RequestPayload{
		API: "foo",
	})
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "Unknown API endpoint 'foo'")
	require.Nil(t, resolved)

	// Resolve filtered API endpoint
	resolved, err = resolver.ResolvePayload(RequestPayload{
		API: "one_pd_api",
	})
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "Unknown API endpoint 'one_pd_api'")
	require.Nil(t, resolved)

	// Resolve without specifying the path param
	resolved, err = resolver.ResolvePayload(RequestPayload{
		API:  "one_tidb_api",
		Host: "tidb-1.internal",
		Port: 12345,
		ParamValues: map[string]string{
			"queryParam": "q1",
		},
	})
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "parameter 'pathParam' is required")
	require.Nil(t, resolved)

	// Resolve without specifying the path param (even if path param is not set to required)
	resolved, err = resolver.ResolvePayload(RequestPayload{
		API:  "another_tidb_api",
		Host: "tidb-1.internal",
		Port: 12345,
	})
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "parameter 'regionID' is required")
	require.Nil(t, resolved)

	resolved, err = resolver.ResolvePayload(RequestPayload{
		API:  "another_tidb_api",
		Host: "tidb-1.internal",
		Port: 12345,
		ParamValues: map[string]string{
			"regionID": "",
		},
	})
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "parameter 'regionID' is required")
	require.Nil(t, resolved)

	// Resolve without specifying the required query param
	resolved, err = resolver.ResolvePayload(RequestPayload{
		API:  "one_tidb_api",
		Host: "tidb-1.internal",
		Port: 12345,
		ParamValues: map[string]string{
			"pathParam": "p1",
		},
	})
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "parameter 'queryParam' is required")
	require.Nil(t, resolved)

	// Resolve with optional query param
	resolved, err = resolver.ResolvePayload(RequestPayload{
		API:  "one_tidb_api",
		Host: "tidb-x.internal",
		Port: 5431,
		ParamValues: map[string]string{
			"pathParam":   "abc/def?q=x",
			"queryParam":  "q",
			"queryParam2": "q?foo",
		},
	})
	require.Nil(t, err)
	require.Equal(t, resolved.api, &apis[1])
	require.Equal(t, "tidb-x.internal", resolved.host)
	require.Equal(t, 5431, resolved.port)
	require.Equal(t, "/test/abc%2Fdef%3Fq=x", resolved.path)
	require.Equal(t, url.Values{"queryParam": []string{"q"}, "queryParam2": []string{"q?foo"}}, resolved.queryValues)

	// Resolve empty optional query param
	resolved, err = resolver.ResolvePayload(RequestPayload{
		API:  "another_tidb_api",
		Host: "tidb-1.internal",
		Port: 12345,
		ParamValues: map[string]string{
			"regionID": "35",
			"state":    "",
		},
	})
	require.Nil(t, err)
	require.Equal(t, resolved.api, &apis[2])
	require.Equal(t, "tidb-1.internal", resolved.host)
	require.Equal(t, 12345, resolved.port)
	require.Equal(t, "/foo/35", resolved.path)
	require.Equal(t, url.Values{}, resolved.queryValues)

	// Resolve with invalid query param (OnResolve returns error)
	resolved, err = resolver.ResolvePayload(RequestPayload{
		API:  "another_tidb_api",
		Host: "tidb-1.internal",
		Port: 12345,
		ParamValues: map[string]string{
			"regionID": "123",
			"state":    "__INVALID__",
		},
	})
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "parameter 'state' is invalid, cause: invalid")
	require.Nil(t, resolved)

	// Resolve param with OnResolve returns something
	resolved, err = resolver.ResolvePayload(RequestPayload{
		API:  "another_tidb_api",
		Host: "tidb-1.internal",
		Port: 12345,
		ParamValues: map[string]string{
			"regionID": "35",
			"state":    "v",
		},
	})
	require.Nil(t, err)
	require.Equal(t, resolved.api, &apis[2])
	require.Equal(t, "tidb-1.internal", resolved.host)
	require.Equal(t, 12345, resolved.port)
	require.Equal(t, "/foo/35", resolved.path)
	require.Equal(t, url.Values{"state": []string{"avb"}}, resolved.queryValues)
}

func TestResolvedRequestPayload(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = fmt.Fprintln(w, r.URL.String())
		_, _ = fmt.Fprintln(w, r.Header.Get("x-test-header"))
	}))
	defer ts.Close()

	addr := ts.Listener.Addr().(*net.TCPAddr)
	rp := ResolvedRequestPayload{
		api: &APIDefinition{
			ID:        "api_id",
			Component: topo.KindTiDB,
			Path:      "/does_not_matter",
			Method:    resty.MethodGet,
			BeforeSendRequest: func(req *httpclient.LazyRequest) {
				req.SetHeader("x-test-header", "hello")
			},
		},
		host:        addr.IP.String(),
		port:        addr.Port,
		path:        "/abc",
		queryValues: nil,
	}

	client := tidbclient.NewStatusClient(httpclient.Config{})
	clients := HTTPClients{
		TiDBStatusClient: client,
	}

	buf := bytes.Buffer{}
	_, err := rp.SendRequestAndPipe(context.Background(), clients, nil, nil, &buf)

	assert.Nil(t, err)
	assert.Equal(t, "/abc\nhello\n", buf.String())
}
