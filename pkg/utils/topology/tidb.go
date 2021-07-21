// Copyright 2020 PingCAP, Inc.
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
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/utils/distro"
	"github.com/pingcap/tidb-dashboard/pkg/utils/host"
)

const tidbTopologyKeyPrefix = "/topology/tidb/"

func FetchTiDBTopology(ctx context.Context, etcdClient *clientv3.Client) ([]TiDBInfo, error) {
	ctx2, cancel := context.WithTimeout(ctx, defaultFetchTimeout)
	defer cancel()

	resp, err := etcdClient.Get(ctx2, tidbTopologyKeyPrefix, clientv3.WithPrefix())
	if err != nil {
		return nil, ErrEtcdRequestFailed.Wrap(err, "failed to get key %s from %s etcd", tidbTopologyKeyPrefix, distro.Data("pd"))
	}

	nodesAlive := make(map[string]struct{}, len(resp.Kvs))
	nodesInfo := make(map[string]*TiDBInfo, len(resp.Kvs))

	for _, kv := range resp.Kvs {
		key := string(kv.Key)
		if !strings.HasPrefix(key, tidbTopologyKeyPrefix) {
			continue
		}
		// remainingKey looks like `ip:port/info` or `ip:port/ttl`.
		remainingKey := key[len(tidbTopologyKeyPrefix):]
		keyParts := strings.Split(remainingKey, "/")
		if len(keyParts) != 2 {
			log.Warn("Ignored invalid topology key", zap.String("component", distro.Data("tidb")), zap.String("key", key))
			continue
		}

		switch keyParts[1] {
		case "info":
			node, err := parseTiDBInfo(keyParts[0], kv.Value)
			if err == nil {
				nodesInfo[keyParts[0]] = node
			} else {
				log.Warn(fmt.Sprintf("Ignored invalid %s topology info entry", distro.Data("tidb")),
					zap.String("key", key),
					zap.String("value", string(kv.Value)),
					zap.Error(err))
			}
		case "ttl":
			alive, err := parseTiDBAliveness(kv.Value)
			if err == nil {
				nodesAlive[keyParts[0]] = struct{}{}
				if !alive {
					log.Warn(fmt.Sprintf("Alive of %s has expired, maybe local time in different hosts are not synchronized", distro.Data("tidb")),
						zap.String("key", key),
						zap.String("value", string(kv.Value)))
				}
			} else {
				log.Warn(fmt.Sprintf("Ignored invalid %s topology TTL entry", distro.Data("tidb")),
					zap.String("key", key),
					zap.String("value", string(kv.Value)),
					zap.Error(err))
			}
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
		return nil, ErrInvalidTopologyData.Wrap(err, "%s info unmarshal failed", distro.Data("tidb"))
	}
	hostname, port, err := host.ParseHostAndPortFromAddress(address)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "%s info address parse failed", distro.Data("tidb"))
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
		return false, ErrInvalidTopologyData.Wrap(err, "%s TTL info parse failed", distro.Data("tidb"))
	}
	t := time.Unix(0, int64(unixTimestampNano))
	if time.Since(t) > time.Second*45 {
		return false, nil
	}
	return true, nil
}
