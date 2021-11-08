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

package tidb

import (
	"context"
	"fmt"
	"time"

	"github.com/ReneKroon/ttlcache/v2"
	"go.etcd.io/etcd/clientv3"

	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
)

const tidbMemberCacheKey = "tidb_members"

type memberHub struct {
	*ttlcache.Cache
	etcdClient *clientv3.Client
}

func newMemberHub(etcdClient *clientv3.Client) *memberHub {
	cache := ttlcache.NewCache()
	cache.SkipTTLExtensionOnHit(true)
	return &memberHub{Cache: cache, etcdClient: etcdClient}
}

func (m *memberHub) GetStatusEndpoints(ctx context.Context) (es map[string]struct{}, err error) {
	esCache, _ := m.Get(tidbMemberCacheKey)
	if esCache != nil {
		es = esCache.(map[string]struct{})
	} else {
		_, es, err = fetchEndpoints(ctx, m.etcdClient)
		if err != nil {
			return nil, err
		}
		// Set cache failure is acceptable
		_ = m.SetWithTTL(tidbMemberCacheKey, es, 10*time.Second)
	}

	return es, nil
}

func fetchEndpoints(ctx context.Context, etcdClient *clientv3.Client) (tidbEndpoints, statusEndpoints map[string]struct{}, err error) {
	topos, err := topology.FetchTiDBTopology(ctx, etcdClient)
	if err != nil {
		return nil, nil, err
	}

	statusEndpoints = make(map[string]struct{}, len(topos))
	tidbEndpoints = make(map[string]struct{}, len(topos))
	for _, server := range topos {
		if server.Status == topology.ComponentStatusUp {
			tidbEndpoints[fmt.Sprintf("%s:%d", server.IP, server.Port)] = struct{}{}
			statusEndpoints[fmt.Sprintf("%s:%d", server.IP, server.StatusPort)] = struct{}{}
		}
	}
	return
}
