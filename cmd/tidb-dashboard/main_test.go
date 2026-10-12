// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/pingcap/tidb-dashboard/pkg/config"
)

func TestHTTPMuxDoesNotExposeDefaultHandlers(t *testing.T) {
	uiHandler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	apiHandler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusAccepted)
	})
	swaggerHandler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusCreated)
	})
	mux := newHTTPMux(uiHandler, apiHandler, swaggerHandler)

	tests := []struct {
		path         string
		wantStatus   int
		wantLocation string
	}{
		{path: config.UIPathPrefix, wantStatus: http.StatusNoContent},
		{path: config.APIPathPrefix, wantStatus: http.StatusAccepted},
		{path: config.SwaggerPathPrefix, wantStatus: http.StatusCreated},
		{path: "/debug/pprof/", wantStatus: http.StatusFound, wantLocation: config.UIPathPrefix},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, tt.path, nil)
			response := httptest.NewRecorder()
			mux.ServeHTTP(response, request)

			if response.Code != tt.wantStatus {
				t.Fatalf("unexpected status: got %d, want %d", response.Code, tt.wantStatus)
			}
			if location := response.Header().Get("Location"); location != tt.wantLocation {
				t.Fatalf("unexpected redirect location: got %q, want %q", location, tt.wantLocation)
			}
		})
	}
}

func TestValidatePprofAddress(t *testing.T) {
	tests := []struct {
		name    string
		address string
		wantErr bool
	}{
		{name: "disabled"},
		{name: "IPv4 loopback", address: "127.0.0.1:6060"},
		{name: "IPv6 loopback", address: "[::1]:6060"},
		{name: "localhost", address: "localhost:6060", wantErr: true},
		{name: "all IPv4 interfaces", address: "0.0.0.0:6060", wantErr: true},
		{name: "all IPv6 interfaces", address: "[::]:6060", wantErr: true},
		{name: "non-loopback", address: "192.0.2.1:6060", wantErr: true},
		{name: "missing port", address: "127.0.0.1", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validatePprofAddress(tt.address)
			if (err != nil) != tt.wantErr {
				t.Fatalf("validatePprofAddress(%q) error = %v, wantErr %v", tt.address, err, tt.wantErr)
			}
		})
	}
}

func TestPprofMux(t *testing.T) {
	mux := newPprofMux()
	tests := []struct {
		path       string
		wantStatus int
	}{
		{path: "/debug/pprof/", wantStatus: http.StatusOK},
		{path: "/debug/pprof/cmdline", wantStatus: http.StatusOK},
		{path: "/debug/pprof/goroutine?debug=1", wantStatus: http.StatusOK},
		{path: "/", wantStatus: http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, tt.path, nil)
			response := httptest.NewRecorder()
			mux.ServeHTTP(response, request)

			if response.Code != tt.wantStatus {
				t.Fatalf("unexpected status: got %d, want %d", response.Code, tt.wantStatus)
			}
		})
	}
}

func TestPprofServerTimeouts(t *testing.T) {
	server := newPprofServer()
	if server.ReadHeaderTimeout != pprofReadTimeout {
		t.Fatalf("unexpected read header timeout: got %s, want %s", server.ReadHeaderTimeout, pprofReadTimeout)
	}
	if server.ReadTimeout != pprofReadTimeout {
		t.Fatalf("unexpected read timeout: got %s, want %s", server.ReadTimeout, pprofReadTimeout)
	}
	if server.WriteTimeout != 0 {
		t.Fatalf("write timeout must remain unrestricted for long-running profiles, got %s", server.WriteTimeout)
	}
}
