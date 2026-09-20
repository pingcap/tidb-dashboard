// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package httpclient

import (
	"crypto/tls"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNewTransportClonesTLSConfig(t *testing.T) {
	tlsConfig := &tls.Config{NextProtos: []string{"http/1.1"}}
	transport := newTransport(tlsConfig)

	require.NotSame(t, tlsConfig, transport.TLSClientConfig)
	transport.TLSClientConfig.NextProtos[0] = "h2"
	require.Equal(t, []string{"http/1.1"}, tlsConfig.NextProtos)
}
