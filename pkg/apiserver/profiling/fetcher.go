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

package profiling

import (
	"fmt"
	"time"

	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/tiflash"
	"github.com/pingcap/tidb-dashboard/pkg/tikv"
)

const (
	maxProfilingTimeout = time.Minute * 5
)

type fetchOptions struct {
	ip   string
	port int
	path string
}

type profileFetcher interface {
	fetch(op *fetchOptions) ([]byte, error)
}

type fetchers struct {
	tikv    profileFetcher
	tiflash profileFetcher
	tidb    profileFetcher
	pd      profileFetcher
}

var newFetchers = fx.Provide(func(
	tikvClient *tikv.Client,
	tidbClient *tidb.Client,
	pdClient *pd.Client,
	tiflashClient *tiflash.Client,
) *fetchers {
	return &fetchers{
		tikv: &tikvFetcher{
			client: tikvClient,
		},
		tiflash: &tiflashFetcher{
			client: tiflashClient,
		},
		tidb: &tidbFetcher{
			client: tidbClient,
		},
		pd: &pdFetcher{
			client: pdClient,
		},
	}
})

type tikvFetcher struct {
	client *tikv.Client
}

func (f *tikvFetcher) fetch(op *fetchOptions) ([]byte, error) {
	resp, err := f.client.NewClientWithHost(fmt.Sprintf("%s:%d", op.ip, op.port)).
		SetTimeout(maxProfilingTimeout).
		R().
		Get(op.path)
	return resp.Body(), err
}

type tiflashFetcher struct {
	client *tiflash.Client
}

func (f *tiflashFetcher) fetch(op *fetchOptions) ([]byte, error) {
	resp, err := f.client.NewClientWithHost(fmt.Sprintf("%s:%d", op.ip, op.port)).
		SetTimeout(maxProfilingTimeout).
		R().
		Get(op.path)
	return resp.Body(), err
}

type tidbFetcher struct {
	client *tidb.Client
}

func (f *tidbFetcher) fetch(op *fetchOptions) ([]byte, error) {
	resp, err := f.client.NewStatusAPIClientWithEnforceHost(fmt.Sprintf("%s:%d", op.ip, op.port)).
		SetTimeout(maxProfilingTimeout).
		R().
		Get(op.path)
	return resp.Body(), err
}

type pdFetcher struct {
	client *pd.Client
}

func (f *pdFetcher) fetch(op *fetchOptions) ([]byte, error) {
	resp, err := f.client.NewClientWithHost(fmt.Sprintf("%s:%d", op.ip, op.port)).
		SetTimeout(maxProfilingTimeout).
		R().
		SetHeader("PD-Allow-follower-handle", "true").
		Get(op.path)
	return resp.Body(), err
}
