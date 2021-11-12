// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

// Package pdclient provides a flexible PD API access to any PD instance.
package pdclient

import (
	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/distro"
)

type APIClient struct {
	*httpclient.Client
}

// Returns error when config is invalid.
func NewAPIClient(config httpclient.APIClientConfig) (*APIClient, error) {
	c2, err := config.IntoConfig(distro.R().PD)
	if err != nil {
		return nil, err
	}
	c2.BaseURL += "/pd/api/v1"
	return &APIClient{httpclient.New(c2)}, nil
}
