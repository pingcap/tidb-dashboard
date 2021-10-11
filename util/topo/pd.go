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

package topo

import (
	"sort"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/client/pdclient"
	"github.com/pingcap/tidb-dashboard/util/distro"
	"github.com/pingcap/tidb-dashboard/util/netutil"
)

func GetPDInstances(pdAPI *pdclient.APIClient) ([]PDInfo, error) {
	ds, err := pdAPI.GetMembers()
	if err != nil {
		return nil, err
	}

	health, err := pdAPI.GetHealth()
	if err != nil {
		return nil, err
	}
	healthMap := map[uint64]struct{}{}
	for _, v := range *health {
		if v.Health {
			healthMap[v.MemberID] = struct{}{}
		}
	}

	nodes := make([]PDInfo, 0)

	for _, ds := range ds.Members {
		u := ds.ClientUrls[0]
		hostname, port, err := netutil.ParseHostAndPortFromAddressURL(u)
		if err != nil {
			continue
		}

		tsResp, err := pdAPI.GetStatus()
		if err != nil {
			log.Warn("Failed to fetch start timestamp",
				zap.String("component", distro.R().PD),
				zap.String("targetNode", u),
				zap.Error(err))
		}

		storeStatus := ComponentStatusUnreachable
		if _, ok := healthMap[ds.MemberID]; ok {
			storeStatus = ComponentStatusUp
		}

		nodes = append(nodes, PDInfo{
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
