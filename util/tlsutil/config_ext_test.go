// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package tlsutil

import (
	"crypto/tls"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNormalizeURL(t *testing.T) {
	var c *tls.Config

	c = nil
	require.Equal(t, "http://foo", NormalizeURL(c, "foo"))
	require.Equal(t, "http://foo", NormalizeURL(c, "http://foo"))
	require.Equal(t, "https://foo", NormalizeURL(c, "https://foo"))
	require.Equal(t, "http://ftp://foo", NormalizeURL(c, "ftp://foo"))

	c = &tls.Config{} // #nosec G402
	require.Equal(t, "https://foo", NormalizeURL(c, "foo"))
	require.Equal(t, "https://foo", NormalizeURL(c, "http://foo"))
	require.Equal(t, "https://foo", NormalizeURL(c, "https://foo"))
	require.Equal(t, "https://ftp://foo", NormalizeURL(c, "ftp://foo"))
}
