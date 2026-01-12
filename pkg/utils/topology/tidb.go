// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package topology

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/pingcap/log"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/distro"
	"github.com/pingcap/tidb-dashboard/util/netutil"
)

const (
	tidbTopologyKeyPrefix = "/topology/tidb/"
	keyspaceNameKeyPrefix = "/keyspaces/tidb"
)

func getAliveNodesAndInfos(ctx context.Context, etcdClient *clientv3.Client, keyPrefix string) (map[string]struct{}, map[string]*TiDBInfo, error) {
	ctx2, cancel := context.WithTimeout(ctx, defaultFetchTimeout)
	defer cancel()

	resp, err := etcdClient.Get(ctx2, keyPrefix, clientv3.WithPrefix())
	if err != nil {
		return nil, nil, ErrEtcdRequestFailed.Wrap(err, "failed to get key %s from %s etcd", keyPrefix, distro.R().PD)
	}

	nodesAlive := make(map[string]struct{}, len(resp.Kvs))
	nodesInfo := make(map[string]*TiDBInfo, len(resp.Kvs))
	for _, kv := range resp.Kvs {
		key := string(kv.Key)
		if !strings.HasPrefix(key, keyPrefix) {
			continue
		}
		// remainingKey looks like `ip:port/info` or `ip:port/ttl`.
		remainingKey := key[len(keyPrefix):]
		keyParts := strings.Split(remainingKey, "/")
		if len(keyParts) != 2 {
			log.Warn("Ignored invalid topology key", zap.String("component", distro.R().TiDB), zap.String("key", key))
			continue
		}

		switch keyParts[1] {
		case "info":
			node, err := parseTiDBInfo(keyParts[0], kv.Value)
			if err == nil {
				nodesInfo[keyParts[0]] = node
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

	return nodesAlive, nodesInfo, nil
}

func getAliveNodesAndInfoWithPrefix(ctx context.Context, etcdClient *clientv3.Client) (map[string]struct{}, map[string]*TiDBInfo, error) {
	childCtx, cancel := context.WithTimeout(ctx, defaultFetchTimeout)
	defer cancel()

	resp, err := etcdClient.Get(childCtx, keyspaceNameKeyPrefix, clientv3.WithPrefix())
	if err != nil {
		return nil, nil, ErrEtcdRequestFailed.Wrap(err, "failed to get key %s from %s etcd", keyspaceNameKeyPrefix, distro.R().PD)
	}

	idMap := make(map[string]struct{})
	for _, kv := range resp.Kvs {
		// layout: /keyspaces/tidb/<id>/topology/tidb/...
		rest := strings.TrimPrefix(string(kv.Key), keyspaceNameKeyPrefix)
		// rest: <id>/topology/tidb/...
		parts := strings.SplitN(rest, "/", 3)
		if len(parts) >= 2 && strings.HasPrefix(parts[2], "topology/tidb/") {
			id := parts[1]
			idMap[id] = struct{}{}
		}
	}

	retryTimes := 3
	nodesAlive := make(map[string]struct{})
	nodesInfo := make(map[string]*TiDBInfo)
	for id := range idMap {
		keyPrefix := fmt.Sprintf("%s/%s/topology/tidb/", keyspaceNameKeyPrefix, id)

		var (
			nodesAlive0 map[string]struct{}
			nodesInfo0  map[string]*TiDBInfo
			err         error
		)
		for i := 1; i <= retryTimes; i++ {
			nodesAlive0, nodesInfo0, err = getAliveNodesAndInfos(childCtx, etcdClient, keyPrefix)
			if err != nil {
				log.Warn("Failed to get TiDB topology nodes", zap.String("keyPrefix", keyPrefix), zap.Int("retry", i), zap.Error(err))
				if i == retryTimes {
					return nil, nil, err
				}
				continue
			}
			break
		}

		for addr := range nodesAlive0 {
			nodesAlive[addr] = struct{}{}
		}
		for addr, info := range nodesInfo0 {
			if _, exists := nodesInfo[addr]; exists {
				// If the same address appears, we keep the first one.
				continue
			}
			nodesInfo[addr] = info
		}
	}

	return nodesAlive, nodesInfo, nil
}

func FetchTiDBTopology(ctx context.Context, etcdClient *clientv3.Client) ([]TiDBInfo, error) {
	nodesAlive, nodesInfo, err := getAliveNodesAndInfos(ctx, etcdClient, tidbTopologyKeyPrefix)
	if err != nil {
		return nil, err
	}
	if len(nodesAlive) == 0 {
		nodesAlive, nodesInfo, err = getAliveNodesAndInfoWithPrefix(ctx, etcdClient)
		if err != nil {
			return nil, err
		}
	}

	nodes := make([]TiDBInfo, 0)
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

func parseTiDBInfo(address string, value []byte) (*TiDBInfo, error) {
	ds := struct {
		Version        string `json:"version"`
		GitHash        string `json:"git_hash"`
		StatusPort     uint   `json:"status_port"`
		DeployPath     string `json:"deploy_path"`
		StartTimestamp int64  `json:"start_timestamp"`
	}{}

	err := json.Unmarshal(value, &ds)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "%s info unmarshal failed", distro.R().TiDB)
	}
	hostname, port, err := netutil.ParseHostAndPortFromAddress(address)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "%s info address parse failed", distro.R().TiDB)
	}

	return &TiDBInfo{
		GitHash:        ds.GitHash,
		Version:        ds.Version,
		IP:             hostname,
		Port:           port,
		DeployPath:     ds.DeployPath,
		Status:         ComponentStatusUnreachable,
		StatusPort:     ds.StatusPort,
		StartTimestamp: ds.StartTimestamp,
	}, nil
}

func parseTiDBAliveness(value []byte) (bool, error) {
	unixTimestampNano, err := strconv.ParseUint(string(value), 10, 64)
	if err != nil {
		return false, ErrInvalidTopologyData.Wrap(err, "%s TTL info parse failed", distro.R().TiDB)
	}
	t := time.Unix(0, int64(unixTimestampNano))
	if time.Since(t) > time.Second*45 {
		return false, nil
	}
	return true, nil
}
