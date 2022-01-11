// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package httpclient

import (
	"context"
	"crypto/tls"
)

type Config struct {
	KindTag    string
	TLSConfig  *tls.Config
	DefaultCtx context.Context
	// DefaultBaseURL is intentionally commented out,
	// as a normal HTTP client is discouraged to use it.
	// DefaultBaseURL string
}
