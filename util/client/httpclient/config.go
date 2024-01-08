// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package httpclient

import (
	"context"
	"crypto/tls"
)

type Config struct {
	KindTag        string
	TLSConfig      *tls.Config
	DefaultCtx     context.Context
	DefaultBaseURL string
}
