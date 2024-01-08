// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package netutil

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseHostAndPortFromAddress(t *testing.T) {
	host, port, err := ParseHostAndPortFromAddress("abc.com:123")
	require.NoError(t, err)
	require.Equal(t, "abc.com", host)
	require.Equal(t, uint(123), port)

	host, port, err = ParseHostAndPortFromAddress("192.168.31.1:1234")
	require.NoError(t, err)
	require.Equal(t, "192.168.31.1", host)
	require.Equal(t, uint(1234), port)

	host, port, err = ParseHostAndPortFromAddress("[::ffff:1.2.3.4]:10023")
	require.NoError(t, err)
	require.Equal(t, "::ffff:1.2.3.4", host)
	require.Equal(t, uint(10023), port)

	host, port, err = ParseHostAndPortFromAddress("[2001:0db8::1428:57ab]:80")
	require.NoError(t, err)
	require.Equal(t, "2001:0db8::1428:57ab", host)
	require.Equal(t, uint(80), port)

	_, _, err = ParseHostAndPortFromAddress("http://abc.com:123")
	require.Error(t, err)

	_, _, err = ParseHostAndPortFromAddress("abc.com")
	require.Error(t, err)

	_, _, err = ParseHostAndPortFromAddress("localhost")
	require.Error(t, err)

	_, _, err = ParseHostAndPortFromAddress("abc.com:def")
	require.Error(t, err)

	_, _, err = ParseHostAndPortFromAddress("::ffff:1.2.3.4:10023")
	require.Error(t, err)

	_, _, err = ParseHostAndPortFromAddress("2001:0db8::1428:57ab:80")
	require.Error(t, err)
}

func TestParseHostAndPortFromAddressURL(t *testing.T) {
	host, port, err := ParseHostAndPortFromAddressURL("http://abc.com:123")
	require.NoError(t, err)
	require.Equal(t, "abc.com", host)
	require.Equal(t, uint(123), port)

	host, port, err = ParseHostAndPortFromAddressURL("https://192.168.31.1:1234")
	require.NoError(t, err)
	require.Equal(t, "192.168.31.1", host)
	require.Equal(t, uint(1234), port)

	host, port, err = ParseHostAndPortFromAddressURL("abc://[::ffff:1.2.3.4]:10023")
	require.NoError(t, err)
	require.Equal(t, "::ffff:1.2.3.4", host)
	require.Equal(t, uint(10023), port)

	host, port, err = ParseHostAndPortFromAddressURL("foo://[2001:0db8::1428:57ab]:80")
	require.NoError(t, err)
	require.Equal(t, "2001:0db8::1428:57ab", host)
	require.Equal(t, uint(80), port)

	_, _, err = ParseHostAndPortFromAddressURL("http://abc.com")
	require.Error(t, err)

	_, _, err = ParseHostAndPortFromAddressURL("abc.com:345")
	require.Error(t, err)

	_, _, err = ParseHostAndPortFromAddressURL("http://localhost")
	require.Error(t, err)

	_, _, err = ParseHostAndPortFromAddressURL("http://abc.com:def")
	require.Error(t, err)

	_, _, err = ParseHostAndPortFromAddressURL("http://::ffff:1.2.3.4:10023")
	require.Error(t, err)

	_, _, err = ParseHostAndPortFromAddressURL("http://2001:0db8::1428:57ab:80")
	require.Error(t, err)
}
