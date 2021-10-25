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
