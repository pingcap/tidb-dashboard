package tidb

import (
	"fmt"
	"io/ioutil"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestProxy(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	want := "hello proxy"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, err := w.Write([]byte(want))
		if err != nil {
			t.Fatal(err)
		}
	}))
	defer server.Close()
	u, err := url.Parse(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	p := NewProxy(l, map[string]string{"test": fmt.Sprintf("%s:%s", u.Hostname(), u.Port())}, 0, 0)
	go p.Run()
	defer p.Stop()

	u.Host = l.Addr().String()
	res, err := http.Get(u.String())
	if err != nil {
		t.Fatal(err)
	}
	got, err := ioutil.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}
	assert.Equal(t, want, string(got))
}

func TestProxyPick(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	n := 3
	endpoints := make(map[string]string)
	picked := make([]bool, n)
	for i := 0; i < n; i++ {
		idx := i
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			picked[idx] = true
			_, err := w.Write([]byte("test"))
			if err != nil {
				t.Fatal(err)
			}
		}))
		defer server.Close()
		u, err := url.Parse(server.URL)
		if err != nil {
			t.Fatal(err)
		}
		key := strconv.Itoa(i)
		endpoints[key] = fmt.Sprintf("%s:%s", u.Hostname(), u.Port())
	}
	p := NewProxy(l, endpoints, 0, 0)
	go p.Run()
	defer p.Stop()

	for i := 0; i < n; i++ {
		client := &http.Client{}
		res, err := client.Get("http://" + l.Addr().String())
		if err != nil {
			t.Fatal(err)
		}
		_, err = ioutil.ReadAll(res.Body)
		if err != nil {
			t.Fatal(err)
		}
		// close conn manually to force proxy re-pick remote
		client.CloseIdleConnections()
		time.Sleep(time.Second)
	}
	for _, pick := range picked {
		assert.True(t, pick)
	}
}
