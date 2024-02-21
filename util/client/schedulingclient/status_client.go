// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Package schedulingclient provides a flexible Scheduling API access to any Scheduling instance.
package schedulingclient

import (
	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/distro"
)

type StatusClient struct {
	*httpclient.Client
}

func NewStatusClient(config httpclient.Config) *StatusClient {
	config.KindTag = distro.R().Scheduling
	return &StatusClient{httpclient.New(config)}
}

func (c *StatusClient) Clone() *StatusClient {
	return &StatusClient{c.Client.Clone()}
}
