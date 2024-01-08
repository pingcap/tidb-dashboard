// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package swaggerserver

import (
	"net/http"

	httpSwagger "github.com/swaggo/http-swagger"
	// Swagger doc.
	_ "github.com/pingcap/tidb-dashboard/swaggerspec"
)

func Handler() http.Handler {
	return httpSwagger.Handler()
}
