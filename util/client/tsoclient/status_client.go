// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Package tsoclient provides a flexible TSO API access to any TSO instance.
package tsoclient

import (
	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/distro"
)

type StatusClient struct {
	*httpclient.Client
}

func NewStatusClient(config httpclient.Config) *StatusClient {
	config.KindTag = distro.R().TSO
	return &StatusClient{httpclient.New(config)}
}

func (c *StatusClient) Clone() *StatusClient {
	return &StatusClient{c.Client.Clone()}
}
