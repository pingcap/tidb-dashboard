// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package topology

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/pingcap/log"
	clientv3 "go.etcd.io/etcd/client/v3"
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
		if !strings.HasPrefix(key, tiproxyTopologyKeyPrefix) {
			continue
		}
		// remainingKey looks like `ip:port/info` or `ip:port/ttl`.
		remainingKey := key[len(tiproxyTopologyKeyPrefix):]
		keyParts := strings.Split(remainingKey, "/")
		if len(keyParts) != 2 {
			log.Warn("Ignored invalid topology key", zap.String("component", distro.R().TiProxy), zap.String("key", key))
			continue
		}

		switch keyParts[1] {
		case "info":
			node, err := parseTiProxyInfo(keyParts[0], kv.Value)
			if err == nil {
				nodesInfo[keyParts[0]] = node
			} else {
				log.Warn(fmt.Sprintf("Ignored invalid %s topology info entry", distro.R().TiProxy),
					zap.String("key", key),
					zap.String("value", string(kv.Value)),
					zap.Error(err))
			}
		case "ttl":
			alive, err := parseTiDBAliveness(kv.Value)
			if err == nil {
				nodesAlive[keyParts[0]] = struct{}{}
				if !alive {
					log.Warn(fmt.Sprintf("Alive of %s has expired, maybe local time in different hosts are not synchronized", distro.R().TiProxy),
						zap.String("key", key),
						zap.String("value", string(kv.Value)))
				}
			} else {
				log.Warn(fmt.Sprintf("Ignored invalid %s topology TTL entry", distro.R().TiProxy),
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

func parseTiProxyInfo(_ string, value []byte) (*TiProxyInfo, error) {
	ds := struct {
		GitHash        string `json:"git_hash"`
		Version        string `json:"version"`
		IP             string `json:"ip"`
		Port           string `json:"port"`
		DeployPath     string `json:"deploy_path"`
		StatusPort     string `json:"status_port"`
		StartTimestamp int64  `json:"start_timestamp"`
	}{}
	err := json.Unmarshal(value, &ds)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "%s info unmarshal failed", distro.R().TiProxy)
	}
	port, err := strconv.ParseUint(ds.Port, 10, 64)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "%s port parse failed", distro.R().TiProxy)
	}
	statusPort, err := strconv.ParseUint(ds.StatusPort, 10, 64)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "%s port parse failed", distro.R().TiProxy)
	}
	return &TiProxyInfo{
		GitHash:        ds.GitHash,
		Version:        ds.Version,
		IP:             ds.IP,
		Port:           uint(port),
		DeployPath:     ds.DeployPath,
		Status:         ComponentStatusUnreachable,
		StatusPort:     uint(statusPort),
		StartTimestamp: ds.StartTimestamp,
	}, nil
}
