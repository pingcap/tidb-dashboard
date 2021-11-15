// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package tlsutil

import (
	"crypto/tls"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNormalizeURL(t *testing.T) {
	var c *tls.Config

	c = nil
	assert.Equal(t, "http://foo", NormalizeURL(c, "foo"))
	assert.Equal(t, "http://foo", NormalizeURL(c, "http://foo"))
	assert.Equal(t, "https://foo", NormalizeURL(c, "https://foo"))
	assert.Equal(t, "http://ftp://foo", NormalizeURL(c, "ftp://foo"))

	c = &tls.Config{} // #nosec G402
	assert.Equal(t, "https://foo", NormalizeURL(c, "foo"))
	assert.Equal(t, "https://foo", NormalizeURL(c, "http://foo"))
	assert.Equal(t, "https://foo", NormalizeURL(c, "https://foo"))
	assert.Equal(t, "https://ftp://foo", NormalizeURL(c, "ftp://foo"))
}
