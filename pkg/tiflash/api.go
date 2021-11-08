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
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package tiflash

import (
	"fmt"

	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
)

func fetchEndpoints(pdClient *pd.Client) (endpoints map[string]struct{}, err error) {
	_, tiflashTopos, err := topology.FetchStoreTopology(pdClient)
	if err != nil {
		return nil, err
	}

	endpoints = make(map[string]struct{}, len(tiflashTopos))
	for _, server := range tiflashTopos {
		if server.Status == topology.ComponentStatusUp {
			endpoints[fmt.Sprintf("%s:%d", server.IP, server.StatusPort)] = struct{}{}
		}
	}
	return
}
