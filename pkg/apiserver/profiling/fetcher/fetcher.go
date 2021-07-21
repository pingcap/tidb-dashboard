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

package fetcher

import (
	"time"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

type ProfileFetchOptions struct {
	Duration time.Duration
}

type ProfilerFetcher interface {
	Fetch(op *ProfileFetchOptions) ([]byte, error)
}

type Fetcher interface {
	Fetch(client Client, target *model.RequestTargetNode, op *ProfileFetchOptions) ([]byte, error)
}

type profilerFetcher struct {
	fetcher Fetcher
	client  Client
	target  *model.RequestTargetNode
}

func (p *profilerFetcher) Fetch(op *ProfileFetchOptions) ([]byte, error) {
	return p.fetcher.Fetch(p.client, p.target, op)
}

type Factory struct {
	client Client
	target *model.RequestTargetNode
}

func (ff *Factory) Create(fetcher Fetcher) ProfilerFetcher {
	return &profilerFetcher{
		fetcher: fetcher,
		client:  ff.client,
		target:  ff.target,
	}
}

func NewFetcherFactory(client Client, target *model.RequestTargetNode) *Factory {
	return &Factory{client: client, target: target}
}
