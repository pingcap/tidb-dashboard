// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package swaggerserver

import (
	"testing"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/swaggerspec"
)

func TestHandlerUpdatesSwaggerBasePath(t *testing.T) {
	basePath := swaggerspec.SwaggerInfo_swagger.BasePath
	t.Cleanup(func() {
		swaggerspec.SwaggerInfo_swagger.BasePath = basePath
	})

	cfg := config.Default()
	cfg.PublicPathPrefix = "/test"
	cfg.NormalizePublicPathPrefix()

	Handler(cfg)

	if swaggerspec.SwaggerInfo_swagger.BasePath != "/test/api" {
		t.Fatalf("basePath = %q, want %q", swaggerspec.SwaggerInfo_swagger.BasePath, "/test/api")
	}
}
