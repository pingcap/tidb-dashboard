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
	"strings"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/client/pdclient"
	"github.com/pingcap/tidb-dashboard/util/netutil"
)

// GetStoreInstances returns TiKV info and TiFlash info.
func GetStoreInstances(pdAPI *pdclient.APIClient) ([]StoreInfo, []StoreInfo, error) {
	stores, err := pdAPI.HLGetStores()
	if err != nil {
		return nil, nil, err
	}

	tiKVStores := make([]pdclient.GetStoresResponseStore, 0, len(stores))
	tiFlashStores := make([]pdclient.GetStoresResponseStore, 0, len(stores))
	for _, store := range stores {
		isTiFlash := false
		for _, label := range store.Labels {
			if label.Key == "engine" && label.Value == "tiflash" {
				isTiFlash = true
			}
		}
		if isTiFlash {
			tiFlashStores = append(tiFlashStores, store)
		} else {
			tiKVStores = append(tiKVStores, store)
		}
	}

	return buildStoreTopology(tiKVStores), buildStoreTopology(tiFlashStores), nil
}

func buildStoreTopology(stores []pdclient.GetStoresResponseStore) []StoreInfo {
	nodes := make([]StoreInfo, 0, len(stores))
	for _, v := range stores {
		hostname, port, err := netutil.ParseHostAndPortFromAddress(v.Address)
		if err != nil {
			log.Warn("Failed to parse store address", zap.Any("store", v))
			continue
		}
		_, statusPort, err := netutil.ParseHostAndPortFromAddress(v.StatusAddress)
		if err != nil {
			log.Warn("Failed to parse store status address", zap.Any("store", v))
			continue
		}
		// In current TiKV, it's version may not start with 'v',
		// so we may need to add a prefix 'v' for it.
		version := strings.Trim(v.Version, "\n ")
		if !strings.HasPrefix(version, "v") {
			version = "v" + version
		}
		node := StoreInfo{
			Version:        version,
			IP:             hostname,
			Port:           port,
			GitHash:        v.GitHash,
			DeployPath:     v.DeployPath,
			Status:         parseStoreState(v.StateName),
			StatusPort:     statusPort,
			Labels:         map[string]string{},
			StartTimestamp: v.StartTimestamp,
		}
		for _, v := range v.Labels {
			node.Labels[v.Key] = v.Value
		}
		nodes = append(nodes, node)
	}

	return nodes
}

func parseStoreState(state string) ComponentStatus {
	state = strings.Trim(strings.ToLower(state), "\n ")
	switch state {
	case "up":
		return ComponentStatusUp
	case "tombstone":
		return ComponentStatusTombstone
	case "offline":
		return ComponentStatusOffline
	case "down":
		return ComponentStatusDown
	case "disconnected":
		return ComponentStatusUnreachable
	default:
		return ComponentStatusUnreachable
	}
}
