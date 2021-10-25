package netutil

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseHostAndPortFromAddress(t *testing.T) {
	host, port, err := ParseHostAndPortFromAddress("abc.com:123")
	assert.Nil(t, err)
	assert.Equal(t, "abc.com", host)
	assert.Equal(t, uint(123), port)

	host, port, err = ParseHostAndPortFromAddress("192.168.31.1:1234")
	assert.Nil(t, err)
	assert.Equal(t, "192.168.31.1", host)
	assert.Equal(t, uint(1234), port)

	host, port, err = ParseHostAndPortFromAddress("[::ffff:1.2.3.4]:10023")
	assert.Nil(t, err)
	assert.Equal(t, "::ffff:1.2.3.4", host)
	assert.Equal(t, uint(10023), port)

	host, port, err = ParseHostAndPortFromAddress("[2001:0db8::1428:57ab]:80")
	assert.Nil(t, err)
	assert.Equal(t, "2001:0db8::1428:57ab", host)
	assert.Equal(t, uint(80), port)

	_, _, err = ParseHostAndPortFromAddress("http://abc.com:123")
	assert.NotNil(t, err)

	_, _, err = ParseHostAndPortFromAddress("abc.com")
	assert.NotNil(t, err)

	_, _, err = ParseHostAndPortFromAddress("localhost")
	assert.NotNil(t, err)

	_, _, err = ParseHostAndPortFromAddress("abc.com:def")
	assert.NotNil(t, err)

	_, _, err = ParseHostAndPortFromAddress("::ffff:1.2.3.4:10023")
	assert.NotNil(t, err)

	_, _, err = ParseHostAndPortFromAddress("2001:0db8::1428:57ab:80")
	assert.NotNil(t, err)
}

func TestParseHostAndPortFromAddressURL(t *testing.T) {
	host, port, err := ParseHostAndPortFromAddressURL("http://abc.com:123")
	assert.Nil(t, err)
	assert.Equal(t, "abc.com", host)
	assert.Equal(t, uint(123), port)

	host, port, err = ParseHostAndPortFromAddressURL("https://192.168.31.1:1234")
	assert.Nil(t, err)
	assert.Equal(t, "192.168.31.1", host)
	assert.Equal(t, uint(1234), port)

	host, port, err = ParseHostAndPortFromAddressURL("abc://[::ffff:1.2.3.4]:10023")
	assert.Nil(t, err)
	assert.Equal(t, "::ffff:1.2.3.4", host)
	assert.Equal(t, uint(10023), port)

	host, port, err = ParseHostAndPortFromAddressURL("foo://[2001:0db8::1428:57ab]:80")
	assert.Nil(t, err)
	assert.Equal(t, "2001:0db8::1428:57ab", host)
	assert.Equal(t, uint(80), port)

	_, _, err = ParseHostAndPortFromAddressURL("http://abc.com")
	assert.NotNil(t, err)

	_, _, err = ParseHostAndPortFromAddressURL("abc.com:345")
	assert.NotNil(t, err)

	_, _, err = ParseHostAndPortFromAddressURL("http://localhost")
	assert.NotNil(t, err)

	_, _, err = ParseHostAndPortFromAddressURL("http://abc.com:def")
	assert.NotNil(t, err)

	_, _, err = ParseHostAndPortFromAddressURL("http://::ffff:1.2.3.4:10023")
	assert.NotNil(t, err)

	_, _, err = ParseHostAndPortFromAddressURL("http://2001:0db8::1428:57ab:80")
	assert.NotNil(t, err)
}
