// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package pdtopo

import (
	"context"
	"strings"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/client/pdclient"
	"github.com/pingcap/tidb-dashboard/util/netutil"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

// GetStoreInstances returns TiKV info and TiFlash info.
func GetStoreInstances(ctx context.Context, pdAPI *pdclient.APIClient) ([]topo.TiKVStoreInfo, []topo.TiFlashStoreInfo, error) {
	stores, err := pdAPI.HLGetStores(ctx)
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

	siTiKV := buildStoreTopology(tiKVStores)
	storesTiKV := make([]topo.TiKVStoreInfo, 0, len(siTiKV))
	for _, si := range siTiKV {
		storesTiKV = append(storesTiKV, topo.TiKVStoreInfo(si))
	}

	siTiFlash := buildStoreTopology(tiFlashStores)
	storesTiFlash := make([]topo.TiFlashStoreInfo, 0, len(siTiFlash))
	for _, si := range siTiFlash {
		storesTiFlash = append(storesTiFlash, topo.TiFlashStoreInfo(si))
	}

	return storesTiKV, storesTiFlash, nil
}

func buildStoreTopology(stores []pdclient.GetStoresResponseStore) []topo.StoreInfo {
	nodes := make([]topo.StoreInfo, 0, len(stores))
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
		node := topo.StoreInfo{
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

func parseStoreState(state string) topo.CompStatus {
	state = strings.Trim(strings.ToLower(state), "\n ")
	switch state {
	case "up":
		return topo.CompStatusUp
	case "tombstone":
		return topo.CompStatusTombstone
	case "offline":
		return topo.CompStatusLeaving
	case "down":
		return topo.CompStatusDown
	case "disconnected":
		return topo.CompStatusUnreachable
	default:
		return topo.CompStatusUnreachable
	}
}
