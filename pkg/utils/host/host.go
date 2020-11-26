// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package host

import (
	"fmt"
	"net"
	"net/url"
	"strconv"
	"strings"
)

// address should be like "ip:port" as "127.0.0.1:2379".
// return error if string is not like "ip:port".
func ParseHostAndPortFromAddress(address string) (string, uint, error) {
	host, port, err := net.SplitHostPort(address)
	if err != nil {
		return "", 0, fmt.Errorf("invalid address: %v", err)
	}
	portNumeric, err := strconv.Atoi(port)
	if err != nil || portNumeric == 0 {
		return "", 0, fmt.Errorf("invalid address: invalid port")
	}
	return strings.ToLower(host), uint(portNumeric), nil
}

// address should be like "protocol://ip:port" as "http://127.0.0.1:2379".
func ParseHostAndPortFromAddressURL(urlString string) (string, uint, error) {
	u, err := url.Parse(urlString)
	if err != nil {
		return "", 0, fmt.Errorf("invalid address: %v", err)
	}
	port, err := strconv.Atoi(u.Port())
	if err != nil || port == 0 {
		return "", 0, fmt.Errorf("invalid address: invalid port")
	}
	return strings.ToLower(u.Hostname()), uint(port), nil
}
