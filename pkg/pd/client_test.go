// Copyright 2021 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package pd

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/joomcode/errorx"
	"github.com/stretchr/testify/require"
	"go.uber.org/fx/fxtest"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
)

func Test_Get(t *testing.T) {
	ts1 := newTestHTTPServer("127.0.0.1:2399")
	defer ts1.Close()

	// valid address
	pc := newTestPDClient(t, ts1.URL)
	data, _ := pc.Get("/aa")
	require.Equal(t, string(data.Body), "2")

	// invalid address
	pc2 := pc.WithBaseURL("http://127.0.0.2:2399")
	_, err2 := pc2.Get("/aa")
	require.Equal(t, errorx.IsOfType(err2, ErrInvalidPDAddr), true)
}

func Test_Post(t *testing.T) {
	ts1 := newTestHTTPServer("127.0.0.1:2399")
	defer ts1.Close()

	// valid address
	pc := newTestPDClient(t, ts1.URL)
	data, _ := pc.Post("/aa", nil)
	require.Equal(t, string(data.Body), "2")

	// invalid address
	pc2 := pc.WithBaseURL("http://127.0.0.2:2399")
	_, err2 := pc2.Post("/aa", nil)
	require.Equal(t, errorx.IsOfType(err2, ErrInvalidPDAddr), true)
}

func Test_unsafeGet(t *testing.T) {
	ts1 := newTestHTTPServer("127.0.0.1:2399")
	defer ts1.Close()
	ts2 := newTestHTTPServer("127.0.0.2:2399")
	defer ts1.Close()

	pc := newTestPDClient(t, ts1.URL)
	data, _ := pc.unsafeGet("/aa")
	require.Equal(t, string(data.Body), "2")

	pc2 := pc.WithBaseURL(ts2.URL)
	data2, _ := pc2.unsafeGet("/aa")
	require.Equal(t, string(data2.Body), "2")
}

func Test_unsafePost(t *testing.T) {
	ts1 := newTestHTTPServer("127.0.0.1:2399")
	defer ts1.Close()
	ts2 := newTestHTTPServer("127.0.0.2:2399")
	defer ts1.Close()

	pc := newTestPDClient(t, ts1.URL)
	data, _ := pc.unsafePost("/aa", nil)
	require.Equal(t, string(data.Body), "2")

	pc2 := pc.WithBaseURL(ts2.URL)
	data2, _ := pc2.unsafePost("/aa", nil)
	require.Equal(t, string(data2.Body), "2")
}

func Test_getEndpoints(t *testing.T) {
	ts1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(infoMembersBytes)
	}))
	ts2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		infoMembers2 := InfoMembers{
			Members: []InfoMember{
				{ClientUrls: []string{"http://127.0.0.1:2401"}},
			},
		}
		infoMembersBytes2, _ := json.Marshal(infoMembers2)
		_, _ = w.Write(infoMembersBytes2)
	}))
	defer ts1.Close()
	defer ts2.Close()

	ts1Result := map[string]struct{}{
		"127.0.0.1:2399": {},
		"127.0.0.1:2400": {},
	}

	pc := newTestPDClient(t, ts1.URL)
	es, _ := pc.getEndpoints()
	require.EqualValues(t, ts1Result, es)

	// cache
	pc2 := pc.WithBaseURL(ts2.URL)
	es1, _ := pc2.getEndpoints()
	require.EqualValues(t, ts1Result, es1)
	time.Sleep(10 * time.Second)
	// always use `config.PDEndPoint` to send `fetchEndpoints` requests with or without cache
	es2, _ := pc2.getEndpoints()
	require.EqualValues(t, ts1Result, es2)
}

func Test_resolveAPIAddress(t *testing.T) {
	pc := newTestPDClient(t, "http://127.0.0.1:2399")

	require.Equal(t, "http://127.0.0.1:2399/pd/api/v1", pc.resolveAPIAddress())

	pc2 := pc.WithAddress("127.0.0.1", 2400)
	require.Equal(t, "http://127.0.0.1:2399/pd/api/v1", pc.resolveAPIAddress())
	require.Equal(t, "http://127.0.0.1:2400/pd/api/v1", pc2.resolveAPIAddress())

	pc3 := pc.WithBaseURL("http://127.0.0.1:2401")
	require.Equal(t, "http://127.0.0.1:2399/pd/api/v1", pc.resolveAPIAddress())
	require.Equal(t, "http://127.0.0.1:2400/pd/api/v1", pc2.resolveAPIAddress())
	require.Equal(t, "http://127.0.0.1:2401/pd/api/v1", pc3.resolveAPIAddress())
}

func Test_needCheckAddress(t *testing.T) {
	pc := newTestPDClient(t, "http://127.0.0.1:2399")

	require.Equal(t, false, pc.needCheckAddress())

	pc2 := pc.WithAddress("127.0.0.1", 2400)
	require.Equal(t, false, pc.needCheckAddress())
	require.Equal(t, true, pc2.needCheckAddress())

	pc3 := pc.WithBaseURL("http://127.0.0.1:2401")
	require.Equal(t, false, pc.needCheckAddress())
	require.Equal(t, true, pc2.needCheckAddress())
	require.Equal(t, true, pc3.needCheckAddress())
}

func Test_checkAPIAddressValidity(t *testing.T) {
	ts1 := newTestHTTPServer("127.0.0.1:2399")
	defer ts1.Close()

	pc := newTestPDClient(t, ts1.URL)
	require.Equal(t, "", pc.baseURL)
	require.Equal(t, errorx.IsOfType(pc.checkAPIAddressValidity(), ErrInvalidPDAddr), true)

	pc2 := pc.WithAddress("127.0.0.1", 2399)
	require.Equal(t, "http://127.0.0.1:2399", pc2.baseURL)
	require.Equal(t, nil, pc2.checkAPIAddressValidity())

	pc3 := pc.WithAddress("127.0.0.1", 2341)
	require.Equal(t, "http://127.0.0.1:2341", pc3.baseURL)
	require.Equal(t, errorx.IsOfType(pc3.checkAPIAddressValidity(), ErrInvalidPDAddr), true)
}

func newTestPDClient(t *testing.T, url string) *Client {
	lc := fxtest.NewLifecycle(t)
	config := &config.Config{
		PDEndPoint: url,
	}
	pc := NewPDClient(lc, httpc.NewHTTPClient(lc, config), config)
	pc.lifecycleCtx = context.Background()
	return pc
}

var infoMembersBytes, _ = json.Marshal(InfoMembers{
	Members: []InfoMember{
		{ClientUrls: []string{"http://127.0.0.1:2399"}},
		{ClientUrls: []string{"http://127.0.0.1:2400"}},
	},
})

func newTestHTTPServer(addr string) *httptest.Server {
	l, err := net.Listen("tcp", addr)
	if err != nil {
		panic(err)
	}
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/pd/api/v1/members" {
			_, _ = w.Write(infoMembersBytes)
		} else {
			_, _ = io.WriteString(w, "2")
		}
	}))
	ts.URL = fmt.Sprintf("http://%s", addr)
	_ = ts.Listener.Close()
	ts.Listener = l
	return ts
}
