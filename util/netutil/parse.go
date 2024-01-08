// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package netutil

import (
	"net"
	"net/url"
	"strconv"

	"github.com/joomcode/errorx"
)

var (
	ErrNS             = errorx.NewNamespace("net_util")
	ErrInvalidAddress = ErrNS.NewType("invalid_address")
)

// ParseHostAndPortFromAddress parse an address in format `host:port` like `127.0.0.1:2379`.
// Returns error if parse failed.
func ParseHostAndPortFromAddress(address string) (string, uint, error) {
	host, port, err := net.SplitHostPort(address)
	if err != nil {
		return "", 0, ErrInvalidAddress.New("Invalid address `%s`, expect format `host:port`", address)
	}
	portNumeric, err := strconv.Atoi(port)
	if err != nil || portNumeric == 0 {
		return "", 0, ErrInvalidAddress.New("Invalid address `%s`, expect port to be numeric", address)
	}
	return host, uint(portNumeric), nil
}

// ParseHostAndPortFromAddressURL parse an address in format `protocol://ip:port/...` like `http://127.0.0.1:2379`.
// Returns error if parse failed.
func ParseHostAndPortFromAddressURL(urlString string) (string, uint, error) {
	u, err := url.Parse(urlString)
	if err != nil {
		return "", 0, ErrInvalidAddress.New("Invalid address `%s`, expect format `http(s)://host:port/...`", urlString)
	}
	host, port, err := ParseHostAndPortFromAddress(u.Host)
	if err != nil {
		return "", 0, err
	}
	return host, port, nil
}
