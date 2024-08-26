// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package testutil

import (
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"

	"go.uber.org/atomic"
)

func GetHTTPServerHost(server *httptest.Server) string {
	return server.Listener.Addr().String()
}

func NewHTTPServer(response string) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = fmt.Fprintln(w, response)
	}))
}

func NewHTTPServerAtHost(response string, host string) *httptest.Server {
	l, err := net.Listen("tcp", host)
	if err != nil {
		panic(err)
	}
	server := &httptest.Server{
		Listener: l,
		Config: &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { // nolint:gosec
			_, _ = fmt.Fprintln(w, response)
		})},
	}
	server.Start()
	return server
}

type MultiServerHelper struct {
	Servers      []*httptest.Server
	lastActiveID *atomic.Int32
	lastResponse *atomic.String
}

func NewMultiServer(n int, responsePattern string) *MultiServerHelper {
	servers := make([]*httptest.Server, 0)
	lastActiveID := atomic.NewInt32(-1)
	lastResponse := atomic.NewString("")

	for i := 0; i < n; i++ {
		func(i int) {
			s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				resp := fmt.Sprintf(responsePattern, i)
				lastActiveID.Store(int32(i))
				lastResponse.Store(resp)
				_, _ = fmt.Fprintln(w, resp)
			}))
			servers = append(servers, s)
		}(i)
	}
	return &MultiServerHelper{
		Servers:      servers,
		lastActiveID: lastActiveID,
		lastResponse: lastResponse,
	}
}

func (m *MultiServerHelper) LastResp() string {
	return m.lastResponse.Load()
}

func (m *MultiServerHelper) LastID() int {
	return int(m.lastActiveID.Load())
}

func (m *MultiServerHelper) CloseAll() {
	for _, s := range m.Servers {
		s.Close()
	}
}

func (m *MultiServerHelper) GetEndpoints() []string {
	l := make([]string, 0)
	for _, s := range m.Servers {
		l = append(l, GetHTTPServerHost(s))
	}
	return l
}
