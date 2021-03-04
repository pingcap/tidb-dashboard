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
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/fetcher"
)

type profiler struct {
	Fetcher fetcher.ProfileFetcher
	Writer  Writer
}

type profileOptions struct {
	fetcher.ProfileFetchOptions
}

func (p *profiler) Profile(op *profileOptions) (string, error) {
	resp, err := p.Fetcher.Fetch(&op.ProfileFetchOptions)
	if err != nil {
		return "", err
	}

	return p.Writer.Write(resp)
}
