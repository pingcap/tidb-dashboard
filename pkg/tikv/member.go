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

package tikv

import (
	"fmt"
	"time"

	"github.com/ReneKroon/ttlcache/v2"

	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
)

const tikvMemberCacheKey = "tikv_members"

type memberHub struct {
	*ttlcache.Cache
	pdClient *pd.Client
}

func newMemberHub(pdClient *pd.Client) *memberHub {
	cache := ttlcache.NewCache()
	cache.SkipTTLExtensionOnHit(true)
	return &memberHub{Cache: cache, pdClient: pdClient}
}

func (m *memberHub) GetEndpoints() (es map[string]struct{}, err error) {
	esCache, _ := m.Get(tikvMemberCacheKey)
	if esCache != nil {
		es = esCache.(map[string]struct{})
	} else {
		es, err = fetchEndpoints(m.pdClient)
		if err != nil {
			return nil, err
		}
		// Set cache failure is acceptable
		_ = m.SetWithTTL(tikvMemberCacheKey, es, 10*time.Second)
	}

	return es, nil
}

func fetchEndpoints(pdClient *pd.Client) (endpoints map[string]struct{}, err error) {
	tikvTopos, _, err := topology.FetchStoreTopology(pdClient)
	if err != nil {
		return nil, err
	}

	endpoints = make(map[string]struct{}, len(tikvTopos))
	for _, server := range tikvTopos {
		if server.Status == topology.ComponentStatusUp {
			endpoints[fmt.Sprintf("%s:%d", server.IP, server.StatusPort)] = struct{}{}
		}
	}
	return
}
