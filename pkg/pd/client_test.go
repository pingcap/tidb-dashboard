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

var infoMembers = InfoMembers{
	Members: []InfoMember{
		{ClientUrls: []string{"http://127.0.0.1:2399"}, BinaryVersion: "1", MemberID: 1},
		{ClientUrls: []string{"http://127.0.0.1:2400"}, BinaryVersion: "1", MemberID: 2},
	},
}
var infoMembers2 = InfoMembers{
	Members: []InfoMember{
		{ClientUrls: []string{"http://127.0.0.1:2401"}, BinaryVersion: "1", MemberID: 3},
	},
}
var infoMembersBytes, _ = json.Marshal(infoMembers)
var infoMembersBytes2, _ = json.Marshal(infoMembers2)

func TestFetchMembers(t *testing.T) {
	ts1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(infoMembersBytes)
	}))
	ts2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(infoMembersBytes2)
	}))
	defer ts1.Close()
	defer ts2.Close()

	pc := newTestPDClient(t, ts1.URL)
	ms, _ := pc.FetchMembers()
	msBytes, _ := json.Marshal(ms)
	require.Equal(t, infoMembersBytes, msBytes)

	pc2 := pc.WithBaseURL(ts2.URL)
	ms2, _ := pc2.FetchMembers()
	msBytes2, _ := json.Marshal(ms2)
	require.Equal(t, infoMembersBytes2, msBytes2)
	require.Equal(t, infoMembersBytes, msBytes)
}

func TestGetMemberAddrs(t *testing.T) {
	ts1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(infoMembersBytes)
	}))
	ts2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(infoMembersBytes2)
	}))
	defer ts1.Close()
	defer ts2.Close()

	pc := newTestPDClient(t, ts1.URL)
	addrs, _ := pc.getMemberAddrs()
	require.Equal(t, []string{"127.0.0.1:2399", "127.0.0.1:2400"}, addrs)

	// test cache
	pc2 := pc.WithBaseURL(ts2.URL)
	addrs2, _ := pc2.getMemberAddrs()
	require.Equal(t, []string{"127.0.0.1:2399", "127.0.0.1:2400"}, addrs2)
	time.Sleep(10 * time.Second)
	addrs3, _ := pc2.getMemberAddrs()
	require.Equal(t, []string{"127.0.0.1:2401"}, addrs3)
}

func TestCheckValidHost(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:2399")
	if err != nil {
		panic(err)
	}
	ts1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(infoMembersBytes)
	}))
	ts1.URL = "http://127.0.0.1:2399"
	_ = ts1.Listener.Close()
	ts1.Listener = l
	defer ts1.Close()

	pc := newTestPDClient(t, ts1.URL)
	err1 := pc.checkValidHost()
	require.Equal(t, err1, nil)

	pc2 := pc.WithBaseURL(infoMembers.Members[1].ClientUrls[0])
	err2 := pc2.checkValidHost()
	require.Equal(t, err2, nil)

	pc3 := pc.WithBaseURL("http://127.0.0.2:2399")
	err3 := pc3.checkValidHost()
	require.Equal(t, errorx.IsOfType(err3, ErrInvalidPDAddr), true)
}

func TestSendGetRequest_WithHostCheck(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:2399")
	if err != nil {
		panic(err)
	}
	ts1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/pd/api/v1/members" {
			_, _ = w.Write(infoMembersBytes)
		} else {
			_, _ = io.WriteString(w, "2")
		}
	}))
	ts1.URL = "http://127.0.0.1:2399"
	_ = ts1.Listener.Close()
	ts1.Listener = l
	defer ts1.Close()

	pc := newTestPDClient(t, ts1.URL)
	data, _ := pc.SendGetRequest("/aa")
	require.Equal(t, string(data), "2")

	pc2 := pc.WithBaseURL("http://127.0.0.2:2399")
	_, err2 := pc2.SendGetRequest("/aa")
	require.Equal(t, errorx.IsOfType(err2, ErrInvalidPDAddr), true)
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
