// Copyright 2021 PingCAP, Inc.
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

// Package tidbproxy provides a TiDB cluster proxy service. It forwards incoming SQL API and
// Status API requests to one of the alive TiDB upstream.
package tidbproxy

import (
	"github.com/pingcap/tidb-dashboard/util/nocopy"
	"github.com/pingcap/tidb-dashboard/util/proxy"
)

type Config struct {
	Proxy proxy.Config
}

type Proxy struct {
	nocopy.NoCopy

	SQLPortProxy    *proxy.Proxy
	StatusPortProxy *proxy.Proxy
}

func New(config Config) (*Proxy, error) {
	sqlProxy, err := proxy.New(config.Proxy)
	if err != nil {
		return nil, err
	}

	statusProxy, err := proxy.New(config.Proxy)
	if err != nil {
		sqlProxy.Close()
		return nil, err
	}

	return &Proxy{
		SQLPortProxy:    sqlProxy,
		StatusPortProxy: statusProxy,
	}, nil
}

func (f *Proxy) Close() {
	f.SQLPortProxy.Close()
	f.StatusPortProxy.Close()
}
