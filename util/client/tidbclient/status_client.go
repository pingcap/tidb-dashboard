// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Package tidbclient provides a flexible TiDB API access to any TiDB instance.
package tidbclient

import (
	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/distro"
)

type StatusClient struct {
	*httpclient.Client
}

func NewStatusClient(config httpclient.Config) *StatusClient {
	config.KindTag = distro.R().TiDB
	return &StatusClient{httpclient.New(config)}
}

func (c *StatusClient) Clone() *StatusClient {
	return &StatusClient{c.Client.Clone()}
}
