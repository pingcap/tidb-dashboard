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

// Package tiflashclient provides a flexible TiFlash API access to any TiFlash instance.
package tiflashclient

import (
	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/distro"
)

type StatusClient struct {
	*httpclient.Client
}

// Returns error when config is invalid.
func NewStatusClient(config httpclient.APIClientConfig) (*StatusClient, error) {
	c2, err := config.IntoConfig(distro.R().TiFlash)
	if err != nil {
		return nil, err
	}
	return &StatusClient{httpclient.New(c2)}, nil
}
