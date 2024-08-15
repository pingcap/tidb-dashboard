// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package pdtopo

import (
	"context"
	"encoding/json"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/pingcap/log"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/distro"
	"github.com/pingcap/tidb-dashboard/util/netutil"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

const tidbTopologyKeyPrefix = "/topology/tidb/"

func GetTiDBInstances(ctx context.Context, etcdClient *clientv3.Client) ([]topo.TiDBInfo, error) {
	resp, err := etcdClient.Get(ctx, tidbTopologyKeyPrefix, clientv3.WithPrefix())
	if err != nil {
		return nil, ErrEtcdRequestFailed.Wrap(err, "Failed to read topology from etcd key `%s`", tidbTopologyKeyPrefix)
	}

	nodesAlive := make(map[string]struct{}, len(resp.Kvs))
	nodesInfo := make(map[string]*topo.TiDBInfo, len(resp.Kvs))

	for _, kv := range resp.Kvs {
		key := string(kv.Key)
		if !strings.HasPrefix(key, tidbTopologyKeyPrefix) {
			continue
		}
		// remainingKey looks like `ip:port/info` or `ip:port/ttl`.
		remainingKey := key[len(tidbTopologyKeyPrefix):]
		keyParts := strings.Split(remainingKey, "/")
		if len(keyParts) != 2 {
			log.Warn("Ignored invalid topology key",
				zap.String("component", distro.R().TiDB),
				zap.String("key", key))
			continue
		}

		switch keyParts[1] {
		case "info":
			node, err := parseTiDBInfo(keyParts[0], kv.Value)
			if err == nil {
				nodesInfo[keyParts[0]] = node
			} else {
				log.Warn("Ignored invalid topology info entry",
					zap.String("component", distro.R().TiDB),
					zap.String("key", key),
					zap.String("value", string(kv.Value)),
					zap.Error(err))
			}
		case "ttl":
			alive, err := parseTiDBAliveness(kv.Value)
			if err == nil {
				nodesAlive[keyParts[0]] = struct{}{}
				if !alive {
					log.Warn("Component alive TTL has expired (maybe local time are not synchronized)",
						zap.String("component", distro.R().TiDB),
						zap.String("key", key),
						zap.String("value", string(kv.Value)))
				}
			} else {
				log.Warn("Ignored invalid topology TTL entry",
					zap.String("component", distro.R().TiDB),
					zap.String("key", key),
					zap.String("value", string(kv.Value)),
					zap.Error(err))
			}
		}
	}

	nodes := make([]topo.TiDBInfo, 0)

	for addr, info := range nodesInfo {
		if _, ok := nodesAlive[addr]; ok {
			info.Status = topo.CompStatusUp
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

func parseTiDBInfo(address string, value []byte) (*topo.TiDBInfo, error) {
	ds := struct {
		Version        string `json:"version"`
		GitHash        string `json:"git_hash"`
		StatusPort     uint   `json:"status_port"`
		DeployPath     string `json:"deploy_path"`
		StartTimestamp int64  `json:"start_timestamp"`
	}{}

	err := json.Unmarshal(value, &ds)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "Read topology value failed")
	}
	hostname, port, err := netutil.ParseHostAndPortFromAddress(address)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "Read topology address failed")
	}

	return &topo.TiDBInfo{
		GitHash:        ds.GitHash,
		Version:        ds.Version,
		IP:             hostname,
		Port:           port,
		DeployPath:     ds.DeployPath,
		Status:         topo.CompStatusUnreachable,
		StatusPort:     ds.StatusPort,
		StartTimestamp: ds.StartTimestamp,
	}, nil
}

func parseTiDBAliveness(value []byte) (bool, error) {
	unixTimestampNano, err := strconv.ParseUint(string(value), 10, 64)
	if err != nil {
		return false, ErrInvalidTopologyData.Wrap(err, "Parse topology TTL info failed")
	}
	t := time.Unix(0, int64(unixTimestampNano))
	if time.Since(t) > time.Second*45 {
		return false, nil
	}
	return true, nil
}
