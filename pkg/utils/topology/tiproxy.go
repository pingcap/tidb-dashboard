// Copyright 2023 PingCAP, Inc. Licensed under Apache-2.0.

package topology

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/distro"
)

const tiproxyTopologyKeyPrefix = "/topology/tiproxy/"

func FetchTiProxyTopology(ctx context.Context, etcdClient *clientv3.Client) ([]TiProxyInfo, error) {
	ctx2, cancel := context.WithTimeout(ctx, defaultFetchTimeout)
	defer cancel()

	resp, err := etcdClient.Get(ctx2, tiproxyTopologyKeyPrefix, clientv3.WithPrefix())
	if err != nil {
		return nil, ErrEtcdRequestFailed.Wrap(err, "failed to get key %s from %s etcd", tiproxyTopologyKeyPrefix, distro.R().PD)
	}

	nodesAlive := make(map[string]struct{}, len(resp.Kvs))
	nodesInfo := make(map[string]*TiProxyInfo, len(resp.Kvs))

	for _, kv := range resp.Kvs {
		key := string(kv.Key)
		if !strings.HasPrefix(key, tidbTopologyKeyPrefix) {
			continue
		}
		// remainingKey looks like `ip:port/info` or `ip:port/ttl`.
		remainingKey := key[len(tidbTopologyKeyPrefix):]
		keyParts := strings.Split(remainingKey, "/")
		if len(keyParts) != 2 {
			log.Warn("Ignored invalid topology key", zap.String("component", distro.R().TiDB), zap.String("key", key))
			continue
		}

		switch keyParts[1] {
		case "info":
			node, err := parseTiDBInfo(keyParts[0], kv.Value)
			if err == nil {
				nodesInfo[keyParts[0]] = &TiProxyInfo{
					GitHash:        node.GitHash,
					Version:        node.Version,
					IP:             node.IP,
					Port:           node.Port,
					DeployPath:     node.DeployPath,
					Status:         node.Status,
					StatusPort:     node.StatusPort,
					StartTimestamp: node.StartTimestamp,
				}
			} else {
				log.Warn(fmt.Sprintf("Ignored invalid %s topology info entry", distro.R().TiDB),
					zap.String("key", key),
					zap.String("value", string(kv.Value)),
					zap.Error(err))
			}
		case "ttl":
			alive, err := parseTiDBAliveness(kv.Value)
			if err == nil {
				nodesAlive[keyParts[0]] = struct{}{}
				if !alive {
					log.Warn(fmt.Sprintf("Alive of %s has expired, maybe local time in different hosts are not synchronized", distro.R().TiDB),
						zap.String("key", key),
						zap.String("value", string(kv.Value)))
				}
			} else {
				log.Warn(fmt.Sprintf("Ignored invalid %s topology TTL entry", distro.R().TiDB),
					zap.String("key", key),
					zap.String("value", string(kv.Value)),
					zap.Error(err))
			}
		}
	}

	nodes := make([]TiProxyInfo, 0)

	for addr, info := range nodesInfo {
		if _, ok := nodesAlive[addr]; ok {
			info.Status = ComponentStatusUp
		}
		nodes = append(nodes, *info)
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
