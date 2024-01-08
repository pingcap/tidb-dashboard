// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// This file only ensures `swaggerspec` package exist even if swagger is not enabled. This is required for `go mod tidy`.

package swaggerspec

import (
	// Make sure that go mod tidy won't clean up necessary dependencies.
	_ "github.com/alecthomas/template"
	_ "github.com/swaggo/swag"
)
