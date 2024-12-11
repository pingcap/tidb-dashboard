// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package proxy

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/go-resty/resty/v2"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/testutil"
)

var configForTest = Config{
	UpstreamProbeInterval: time.Millisecond * 200,
}

const probeWait = time.Millisecond * 500 // UpstreamProbeInterval*2.5

func sendGetToProxy(proxy *Proxy) (*resty.Response, error) {
	url := fmt.Sprintf("http://127.0.0.1:%d", proxy.Port())
	return resty.New().SetTimeout(time.Millisecond * 500).R().Get(url)
}

func TestNoUpstream(t *testing.T) {
	p, err := New(configForTest)
	require.NoError(t, err)
	defer p.Close()

	require.False(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p)
	require.Error(t, err)
}

func TestAddUpstream(t *testing.T) {
	p, err := New(configForTest)
	require.NoError(t, err)
	defer p.Close()

	server := testutil.NewHTTPServer("foo")
	defer server.Close()

	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server)})
	require.False(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p)
	// Incoming connection will not be established until a probe interval.
	require.Error(t, err)
	require.False(t, p.HasActiveUpstream())

	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err := sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "foo", resp.String())
}

func TestAddMultipleUpstream(t *testing.T) {
	p, err := New(configForTest)
	require.NoError(t, err)
	defer p.Close()

	servers := testutil.NewMultiServer(5, "foo#%d")
	defer servers.CloseAll()

	require.False(t, p.HasActiveUpstream())
	p.SetUpstreams(servers.GetEndpoints())
	_, err = sendGetToProxy(p)
	require.Error(t, err)
	require.False(t, p.HasActiveUpstream())

	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err := sendGetToProxy(p)
	require.NoError(t, err)
	require.Contains(t, resp.String(), "foo#")
	require.Equal(t, servers.LastResp(), resp.String())
}

func TestRemoveAllUpstreams(t *testing.T) {
	p, err := New(configForTest)
	require.NoError(t, err)
	defer p.Close()

	server := testutil.NewHTTPServer("foo")
	defer server.Close()

	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server)})
	require.False(t, p.HasActiveUpstream())
	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err := sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "foo", resp.String())

	p.SetUpstreams([]string{})
	require.False(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p)
	require.Error(t, err)
}

func TestRemoveOneUpstream(t *testing.T) {
	p, err := New(configForTest)
	require.NoError(t, err)
	defer p.Close()

	server1 := testutil.NewHTTPServer("foo")
	defer server1.Close()

	server2 := testutil.NewHTTPServer("bar")
	defer server2.Close()

	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server1)})
	require.False(t, p.HasActiveUpstream())
	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err := sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "foo", resp.String())

	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server1), testutil.GetHTTPServerHost(server2)})
	require.True(t, p.HasActiveUpstream())
	time.Sleep(probeWait)
	resp, err = sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "foo", resp.String())
	require.True(t, p.HasActiveUpstream())

	// The active upstream is removed, another upstream should be used.
	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server2)})
	require.True(t, p.HasActiveUpstream())
	resp, err = sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "bar", resp.String())

	// Add upstream back
	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server1), testutil.GetHTTPServerHost(server2)})
	require.True(t, p.HasActiveUpstream())
	resp, err = sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "bar", resp.String())

	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err = sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "bar", resp.String())
}

func TestPickLastActiveUpstream(t *testing.T) {
	p, err := New(configForTest)
	require.NoError(t, err)
	defer p.Close()

	server1 := testutil.NewHTTPServer("foo")
	defer server1.Close()

	server2 := testutil.NewHTTPServer("bar")
	defer server2.Close()

	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server1)})
	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err := sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "foo", resp.String())

	// Even if SetUpstreams is called, the active upstream should be unchanged.
	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server1), testutil.GetHTTPServerHost(server2)})
	require.True(t, p.HasActiveUpstream())
	resp, err = sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "foo", resp.String())

	time.Sleep(probeWait)
	for i := 0; i < 5; i++ {
		// Let's try multiple times! We should always get "foo".
		require.True(t, p.HasActiveUpstream())
		resp, err = sendGetToProxy(p)
		require.NoError(t, err)
		require.Equal(t, "foo", resp.String())
	}
}

func TestAllUpstreamDown(t *testing.T) {
	p, err := New(configForTest)
	require.NoError(t, err)
	defer p.Close()

	servers := testutil.NewMultiServer(3, "foo#%d")
	defer servers.CloseAll()

	p.SetUpstreams(servers.GetEndpoints())
	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err := sendGetToProxy(p)
	require.NoError(t, err)
	require.Contains(t, resp.String(), "foo#")
	require.Equal(t, servers.LastResp(), resp.String())

	servers.CloseAll()
	require.True(t, p.HasActiveUpstream())

	time.Sleep(probeWait)
	// Since we only set inactive when new connection is established (lazily), HasActiveUpstream is still true here.
	require.True(t, p.HasActiveUpstream())

	_, err = sendGetToProxy(p)
	require.Error(t, err)
	require.False(t, p.HasActiveUpstream())
}

func TestActiveUpstreamDown(t *testing.T) {
	p, err := New(configForTest)
	require.NoError(t, err)
	defer p.Close()

	servers := testutil.NewMultiServer(5, "foo#%d")
	defer servers.CloseAll()

	p.SetUpstreams(servers.GetEndpoints())
	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err := sendGetToProxy(p)
	require.NoError(t, err)
	require.Contains(t, resp.String(), "foo#")
	require.Equal(t, servers.LastResp(), resp.String())
	require.Equal(t, fmt.Sprintf("foo#%d", servers.LastID()), resp.String())

	// Close the last accessed server
	servers.Servers[servers.LastID()].Close()

	// The connection is still succeeded, but forwarded to another upstream.
	resp2, err := sendGetToProxy(p)
	require.NoError(t, err)
	require.Contains(t, resp2.String(), "foo#")
	require.Equal(t, servers.LastResp(), resp2.String())
	require.NotEqual(t, resp.String(), resp2.String()) // Check upstream has changed

	time.Sleep(probeWait)
	resp3, err := sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, resp3.String(), resp2.String()) // Unchanged
}

func TestNonActiveUpstreamDown(t *testing.T) {
	p, err := New(configForTest)
	require.NoError(t, err)
	defer p.Close()

	servers := testutil.NewMultiServer(5, "foo#%d")
	defer servers.CloseAll()

	p.SetUpstreams(servers.GetEndpoints())
	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err := sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, fmt.Sprintf("foo#%d", servers.LastID()), resp.String())

	// Close other non active servers
	for i := 0; i < 5; i++ {
		if i != servers.LastID() {
			servers.Servers[i].Close()
		}
	}

	resp2, err := sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, resp.String(), resp2.String()) // Unchanged

	time.Sleep(probeWait)
	resp3, err := sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, resp.String(), resp3.String()) // Unchanged
}

func TestBrokenServer(t *testing.T) {
	p, err := New(configForTest)
	require.NoError(t, err)
	defer p.Close()

	server := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = fmt.Fprintln(w, "foo")
	}))
	defer server.Close()

	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server)})
	require.False(t, p.HasActiveUpstream())

	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())

	_, err = sendGetToProxy(p)
	require.Error(t, err)
	require.True(t, os.IsTimeout(err))
	require.True(t, p.HasActiveUpstream())

	// In this case, proxy will not switch the upstream by design. Let's check it is still
	// connecting the original "broken" upstream.
	server2 := testutil.NewHTTPServer("foo")
	defer server2.Close()

	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server), testutil.GetHTTPServerHost(server2)})
	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())

	_, err = sendGetToProxy(p)
	require.Error(t, err)
	require.True(t, os.IsTimeout(err))

	// Let's remove the first upstream! We should get success response immediately without waiting probe.
	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server2)})
	resp, err := sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "foo", resp.String())
}

func TestUpstreamBack(t *testing.T) {
	p, err := New(configForTest)
	require.NoError(t, err)
	defer p.Close()

	server := testutil.NewHTTPServer("foo")
	defer server.Close()
	host := testutil.GetHTTPServerHost(server)

	p.SetUpstreams([]string{host})
	require.False(t, p.HasActiveUpstream())
	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err := sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "foo", resp.String())

	// Close the upstream server
	server.Close()
	_, err = sendGetToProxy(p)
	require.Error(t, err)
	require.False(t, p.HasActiveUpstream())

	// Start the upstream server again at the original listen address
	server2 := testutil.NewHTTPServerAtHost("bar", host)
	defer server2.Close()
	// We will still get failure here, even if the upstream is back. It will recover at next probe round.
	require.False(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p)
	require.Error(t, err)
	require.False(t, p.HasActiveUpstream())

	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err = sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "bar", resp.String())
}

func TestUpstreamSwitchComplex(t *testing.T) {
	p, err := New(configForTest)
	require.NoError(t, err)
	defer p.Close()

	server := testutil.NewHTTPServer("foo")
	defer server.Close()

	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server)})
	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err := sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "foo", resp.String())

	server2 := testutil.NewHTTPServer("bar")
	defer server2.Close()

	// Let's close the current upstream
	server.Close()
	require.True(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p)
	require.Error(t, err)
	require.False(t, p.HasActiveUpstream())

	// Wait one round probe, nothing is changed
	time.Sleep(probeWait)
	require.False(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p)
	require.Error(t, err)

	// Add a new alive upstream
	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server), testutil.GetHTTPServerHost(server2)})
	require.False(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p)
	require.Error(t, err)

	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err = sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "bar", resp.String())

	// Bring down the new upstream again!
	server2.Close()

	require.True(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p)
	require.Error(t, err)

	server3 := testutil.NewHTTPServer("box")
	defer server3.Close()
	host3 := testutil.GetHTTPServerHost(server3)

	// Add a new alive upstream
	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server), testutil.GetHTTPServerHost(server2), host3})
	require.False(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p)
	require.Error(t, err)

	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err = sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "box", resp.String())

	server3.Close()

	server4 := testutil.NewHTTPServer("car")
	host4 := testutil.GetHTTPServerHost(server4)
	server4.Close()

	// Add a bad upstream
	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server), testutil.GetHTTPServerHost(server2), host3, host4})
	require.True(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p)
	require.Error(t, err)
	require.False(t, p.HasActiveUpstream())

	time.Sleep(probeWait)
	require.False(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p)
	require.Error(t, err)

	// Bring back server3
	server3New := testutil.NewHTTPServerAtHost("newBox", host3)
	defer server3New.Close()

	require.False(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p)
	require.Error(t, err)

	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err = sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "newBox", resp.String())

	// Remove server3
	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server), testutil.GetHTTPServerHost(server2), host4})
	require.True(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p)
	require.Error(t, err)
	require.False(t, p.HasActiveUpstream())
	time.Sleep(probeWait)
	require.False(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p)
	require.Error(t, err)

	// Remove server4
	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server), testutil.GetHTTPServerHost(server2)})
	_, err = sendGetToProxy(p)
	require.Error(t, err)
	require.False(t, p.HasActiveUpstream())

	// Start server4 again, nothing should be changed (keep failure).
	server4New := testutil.NewHTTPServerAtHost("newCar", host4)
	defer server4New.Close()

	_, err = sendGetToProxy(p)
	require.Error(t, err)
	require.False(t, p.HasActiveUpstream())
	time.Sleep(probeWait)
	require.False(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p)
	require.Error(t, err)

	// Add server3 back to the upstream
	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server2), host3})
	require.False(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p)
	require.Error(t, err)
	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err = sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "newBox", resp.String())
	require.True(t, p.HasActiveUpstream())

	// Change upstream to host4
	p.SetUpstreams([]string{host4})
	require.True(t, p.HasActiveUpstream())
	_, err = sendGetToProxy(p) // At this time, active upstream is host3, and host4 is not recognized as alive, so it should fail
	require.Error(t, err)
	require.False(t, p.HasActiveUpstream())

	time.Sleep(probeWait)
	resp, err = sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "newCar", resp.String())
	require.True(t, p.HasActiveUpstream())
}

func TestClose(t *testing.T) {
	p, err := New(configForTest)
	require.NoError(t, err)
	defer p.Close()

	server := testutil.NewHTTPServer("foo")
	defer server.Close()

	p.SetUpstreams([]string{testutil.GetHTTPServerHost(server)})
	time.Sleep(probeWait)
	require.True(t, p.HasActiveUpstream())
	resp, err := sendGetToProxy(p)
	require.NoError(t, err)
	require.Equal(t, "foo", resp.String())

	p.Close()
	require.True(t, p.HasActiveUpstream()) // TODO: Should we fix this behaviour?
	_, err = sendGetToProxy(p)
	require.Error(t, err)

	p.Close() // Close again should be fine!
}
