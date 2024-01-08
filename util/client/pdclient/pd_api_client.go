// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Package pdclient provides a flexible PD API access to any PD instance.
package pdclient

import (
	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/distro"
)

type APIClient struct {
	*httpclient.Client
}

func NewAPIClient(config httpclient.Config) *APIClient {
	config.KindTag = distro.R().PD
	return &APIClient{httpclient.New(config)}
}

func (c *APIClient) Clone() *APIClient {
	return &APIClient{c.Client.Clone()}
}
