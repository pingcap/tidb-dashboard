// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

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
