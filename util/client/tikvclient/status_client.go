// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

// Package tikvclient provides a flexible TiKV API access to any TiKV instance.
package tikvclient

import (
	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/distro"
)

type StatusClient struct {
	*httpclient.Client
}

// NewStatusClient returns error when config is invalid.
func NewStatusClient(config httpclient.APIClientConfig) (*StatusClient, error) {
	c2, err := config.IntoConfig(distro.R().TiKV)
	if err != nil {
		return nil, err
	}
	return &StatusClient{httpclient.New(c2)}, nil
}
