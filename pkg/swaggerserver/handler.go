// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package swaggerserver

import (
	"net/http"
	"strings"

	httpSwagger "github.com/swaggo/http-swagger"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/swaggerspec"
)

func Handler(cfg *config.Config) http.Handler {
	swaggerspec.SwaggerInfo_swagger.BasePath = strings.TrimRight(cfg.APIPathPrefix(), "/")
	return httpSwagger.Handler()
}
