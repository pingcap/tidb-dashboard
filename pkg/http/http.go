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

package http

import (
	"crypto/tls"
	"net"
	"net/http"
	"time"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

const (
	HTTPTimeout = time.Second * 3
)

func NewHTTPClientWithConf(config *config.Config) *http.Client {
	return &http.Client{
		Transport: &http.Transport{
			DialTLS: func(network, addr string) (net.Conn, error) {
				conn, err := tls.Dial(network, addr, config.TLSConfig)
				return conn, err
			},
		},
		Timeout: HTTPTimeout,
	}
}
