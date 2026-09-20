// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package config

import "testing"

func TestNormalizePublicPathPrefix(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		prefix  string
		ui      string
		api     string
		swagger string
	}{
		{
			name:    "empty uses default",
			input:   "",
			prefix:  "/dashboard",
			ui:      "/dashboard/",
			api:     "/dashboard/api/",
			swagger: "/dashboard/api/swagger/",
		},
		{
			name:    "custom with leading slash",
			input:   "/test",
			prefix:  "/test",
			ui:      "/test/",
			api:     "/test/api/",
			swagger: "/test/api/swagger/",
		},
		{
			name:    "custom with trailing slash",
			input:   "/test/",
			prefix:  "/test",
			ui:      "/test/",
			api:     "/test/api/",
			swagger: "/test/api/swagger/",
		},
		{
			name:    "custom without leading slash",
			input:   "test",
			prefix:  "/test",
			ui:      "/test/",
			api:     "/test/api/",
			swagger: "/test/api/swagger/",
		},
		{
			name:    "root prefix",
			input:   "/",
			prefix:  "",
			ui:      "/",
			api:     "/api/",
			swagger: "/api/swagger/",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := &Config{PublicPathPrefix: tt.input}
			cfg.NormalizePublicPathPrefix()

			if cfg.PublicPathPrefix != tt.prefix {
				t.Fatalf("PublicPathPrefix = %q, want %q", cfg.PublicPathPrefix, tt.prefix)
			}
			if cfg.UIPathPrefix() != tt.ui {
				t.Fatalf("UIPathPrefix() = %q, want %q", cfg.UIPathPrefix(), tt.ui)
			}
			if cfg.APIPathPrefix() != tt.api {
				t.Fatalf("APIPathPrefix() = %q, want %q", cfg.APIPathPrefix(), tt.api)
			}
			if cfg.SwaggerPathPrefix() != tt.swagger {
				t.Fatalf("SwaggerPathPrefix() = %q, want %q", cfg.SwaggerPathPrefix(), tt.swagger)
			}
		})
	}
}
