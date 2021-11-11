package httpclient

import (
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestRemoteEndpointError(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "Some internal error", http.StatusInternalServerError)
	}))
	defer ts.Close()

	client := New(Config{})
	cancel, resp, err := client.LifecycleR().Get(ts.URL)
	defer cancel()
	require.NotNil(t, err)
	require.NotNil(t, resp)
	require.False(t, resp.IsSuccess())
	require.Equal(t, http.StatusInternalServerError, resp.StatusCode())
}

func TestRemoteEndpointBadServer(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.Nil(t, err)
	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			_ = conn.Close()
		}
	}()
	defer func() {
		_ = listener.Close()
	}()

	client := New(Config{})
	cancel, resp, err := client.LifecycleR().Get(fmt.Sprintf("http://%s/foo", listener.Addr().String()))
	defer cancel()
	require.NotNil(t, err)
	require.NotNil(t, resp)
	require.False(t, resp.IsSuccess())
}

func TestBadScheme(t *testing.T) {
	client := New(Config{})
	cancel, resp, err := client.LifecycleR().Get("foo://abc.com")
	defer cancel()
	require.NotNil(t, err)
	require.NotNil(t, resp)
	require.False(t, resp.IsSuccess())
}

func TestTimeoutHeader(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(time.Second * 1)
		_, _ = fmt.Fprintln(w, "OK")
	}))
	defer ts.Close()

	now := time.Now()

	client := New(Config{})
	cancel, resp, err := client.LifecycleR().SetTimeout(100 * time.Millisecond).Get(ts.URL)
	defer cancel()
	require.NotNil(t, err)
	require.NotNil(t, resp)
	require.False(t, resp.IsSuccess())
	require.LessOrEqual(t, time.Since(now), 500*time.Millisecond)
}

func TestTimeoutBody(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		w.(http.Flusher).Flush()
		time.Sleep(time.Second * 1)
		_, _ = fmt.Fprintln(w, "OK")
	}))
	defer ts.Close()

	now := time.Now()

	client := New(Config{})
	cancel, resp, err := client.LifecycleR().SetTimeout(100 * time.Millisecond).Get(ts.URL)
	defer cancel()
	require.NotNil(t, err)
	require.NotNil(t, resp)
	// Note: in this case, since a response code is returned, we have IsSuccess = true. An error is also returned.
	require.True(t, resp.IsSuccess())
	require.Equal(t, http.StatusOK, resp.StatusCode())
	require.LessOrEqual(t, time.Since(now), 500*time.Millisecond)
}

func TestUnmarshalFailure1(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("content-type", "application/json")
		_, _ = fmt.Fprintln(w, "InvalidJSON")
	}))
	defer ts.Close()

	type respType struct {
		Foo int
	}

	client := New(Config{})
	cancel, resp, err := client.LifecycleR().SetJSONResult(&respType{}).Get(ts.URL)
	defer cancel()
	require.NotNil(t, err)
	require.NotNil(t, resp)
	require.True(t, resp.IsSuccess())
}

func TestUnmarshalFailure2(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = fmt.Fprintln(w, "InvalidJSON")
	}))
	defer ts.Close()

	type respType struct {
		Foo int
	}

	client := New(Config{})
	cancel, resp, err := client.LifecycleR().SetJSONResult(&respType{}).Get(ts.URL)
	defer cancel()
	require.NotNil(t, err)
	require.NotNil(t, resp)
	require.True(t, resp.IsSuccess())
}
