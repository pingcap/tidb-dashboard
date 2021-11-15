// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

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
