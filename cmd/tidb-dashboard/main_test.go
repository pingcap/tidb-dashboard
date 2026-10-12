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
