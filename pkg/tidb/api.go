// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package tidb

import (
	"context"
	"fmt"

	"go.etcd.io/etcd/clientv3"

	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
)

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
