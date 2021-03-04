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
	"fmt"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

var _ ProfileFetcher = (*FlameGraph)(nil)

type FlameGraph struct {
	Client *Client
	Target *model.RequestTargetNode
}

func (f *FlameGraph) Fetch(op *ProfileFetchOptions) ([]byte, error) {
	path := fmt.Sprintf("/debug/pprof/profile?seconds=%d", op.Duration)
	return (*f.Client).Fetch(&ClientFetchOptions{IP: f.Target.IP, Port: f.Target.Port, Path: path})
}
