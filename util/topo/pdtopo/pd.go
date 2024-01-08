// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package pdtopo

import (
	"context"
	"sort"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/client/pdclient"
	"github.com/pingcap/tidb-dashboard/util/distro"
	"github.com/pingcap/tidb-dashboard/util/netutil"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

func GetPDInstances(ctx context.Context, pdAPI *pdclient.APIClient) ([]topo.PDInfo, error) {
	ds, err := pdAPI.GetMembers(ctx)
	if err != nil {
		return nil, err
	}

	health, err := pdAPI.GetHealth(ctx)
	if err != nil {
		return nil, err
	}
	healthMap := map[uint64]struct{}{}
	for _, v := range *health {
		if v.Health {
			healthMap[v.MemberID] = struct{}{}
		}
	}

	nodes := make([]topo.PDInfo, 0)

	for _, ds := range ds.Members {
		u := ds.ClientUrls[0]
		hostname, port, err := netutil.ParseHostAndPortFromAddressURL(u)
		if err != nil {
			continue
		}

		tsResp, err := pdAPI.GetStatus(ctx)
		if err != nil {
			log.Warn("Failed to fetch start timestamp",
				zap.String("component", distro.R().PD),
				zap.String("targetNode", u),
				zap.Error(err))
			tsResp = &pdclient.GetStatusResponse{}
		}

		storeStatus := topo.CompStatusUnreachable
		if _, ok := healthMap[ds.MemberID]; ok {
			storeStatus = topo.CompStatusUp
		}

		nodes = append(nodes, topo.PDInfo{
			GitHash:        ds.GitHash,
			Version:        ds.BinaryVersion,
			IP:             hostname,
			Port:           port,
			DeployPath:     ds.DeployPath,
			Status:         storeStatus,
			StartTimestamp: tsResp.StartTimestamp,
		})
	}

	sort.Slice(nodes, func(i, j int) bool {
		if nodes[i].IP < nodes[j].IP {
			return true
		}
		if nodes[i].IP > nodes[j].IP {
			return false
		}
		return nodes[i].Port < nodes[j].Port
	})

	return nodes, nil
}
