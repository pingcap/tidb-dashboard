// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package topology

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/pingcap/log"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/distro"
	"github.com/pingcap/tidb-dashboard/util/netutil"
)

// TODO: refactor this with topology prefix since it is compatible with other components.
const (
	ticdcTopologyKeyPrefix = "/topology/ticdc/"
)

func FetchTiCDCTopology(ctx context.Context, etcdClient *clientv3.Client) ([]TiCDCInfo, error) {
	ctx2, cancel := context.WithTimeout(ctx, defaultFetchTimeout)
	defer cancel()

	resp, err := etcdClient.Get(ctx2, ticdcTopologyKeyPrefix, clientv3.WithPrefix())
	if err != nil {
		return nil, ErrEtcdRequestFailed.Wrap(err, "failed to get key %s from %s etcd", ticdcTopologyKeyPrefix, distro.R().PD)
	}

	nodes := make([]TiCDCInfo, 0)
	for _, kv := range resp.Kvs {
		key := string(kv.Key)
		if !strings.HasPrefix(key, ticdcTopologyKeyPrefix) {
			continue
		}

		// parse default
		keys := strings.TrimPrefix(key, ticdcTopologyKeyPrefix)
		clusterName := strings.Split(keys, "/")[0]

		nodeInfo, err := parseTiCDCInfo(clusterName, kv.Value)
		if err != nil {
			log.Warn(fmt.Sprintf("Ignored invalid %s topology info entry", distro.R().TiCDC),
				zap.String("key", key),
				zap.String("value", string(kv.Value)),
				zap.Error(err))
			continue
		}

		nodes = append(nodes, *nodeInfo)
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

func parseTiCDCInfo(clusterName string, value []byte) (*TiCDCInfo, error) {
	ds := struct {
		ID             string `json:"id"`
		Address        string `json:"address"`
		Version        string `json:"version"`
		GitHash        string `json:"git-hash"`
		DeployPath     string `json:"deploy-path"`
		StartTimestamp int64  `json:"start-timestamp"`
	}{}

	err := json.Unmarshal(value, &ds)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "%s info unmarshal failed", distro.R().TiCDC)
	}
	hostname, port, err := netutil.ParseHostAndPortFromAddress(ds.Address)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "%s info address parse failed", distro.R().TiCDC)
	}

	return &TiCDCInfo{
		ClusterName:    clusterName,
		GitHash:        ds.GitHash,
		Version:        ds.Version,
		IP:             hostname,
		Port:           port,
		DeployPath:     ds.DeployPath,
		Status:         ComponentStatusUp,
		StatusPort:     port,
		StartTimestamp: ds.StartTimestamp,
	}, nil
}
