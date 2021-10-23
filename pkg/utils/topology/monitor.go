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
	"strconv"
	"strings"
	"time"

	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/utils/distro"
)

func FetchAlertManagerTopology(ctx context.Context, etcdClient *clientv3.Client) (*AlertManagerInfo, error) {
	i, err := fetchStandardComponentTopology(ctx, "alertmanager", etcdClient)
	if err != nil {
		return nil, err
	}
	if i == nil {
		return nil, nil
	}
	return &AlertManagerInfo{StandardComponentInfo: *i}, nil
}

func FetchGrafanaTopology(ctx context.Context, etcdClient *clientv3.Client) (*GrafanaInfo, error) {
	i, err := fetchStandardComponentTopology(ctx, "grafana", etcdClient)
	if err != nil {
		return nil, err
	}
	if i == nil {
		return nil, nil
	}
	return &GrafanaInfo{StandardComponentInfo: *i}, nil
}

func FetchPrometheusTopology(ctx context.Context, etcdClient *clientv3.Client) (*PrometheusInfo, error) {
	i, err := fetchStandardComponentTopology(ctx, "prometheus", etcdClient)
	if err != nil {
		return nil, err
	}
	if i == nil {
		return nil, nil
	}
	return &PrometheusInfo{StandardComponentInfo: *i}, nil
}

const ngMonitoringKeyPrefix = "/topology/ng-monitoring/"

func FetchNgMonitoringTopology(ctx context.Context, etcdClient *clientv3.Client) (string, error) {
	ctx2, cancel := context.WithTimeout(ctx, defaultFetchTimeout)
	defer cancel()

	resp, err := etcdClient.Get(ctx2, ngMonitoringKeyPrefix, clientv3.WithPrefix())
	if err != nil {
		return "", ErrEtcdRequestFailed.Wrap(err, "failed to get key %s from %s etcd", ngMonitoringKeyPrefix, distro.Data("pd"))
	}

	for _, kv := range resp.Kvs {
		key := string(kv.Key)
		if !strings.HasPrefix(key, ngMonitoringKeyPrefix) {
			continue
		}
		// remainingKey looks like `ip:port/info` or `ip:port/ttl`.
		remainingKey := key[len(ngMonitoringKeyPrefix):]
		keyParts := strings.Split(remainingKey, "/")
		if len(keyParts) != 2 {
			log.Warn("Ignored invalid topology key", zap.String("component", "ng-monitoring"), zap.String("key", key))
			continue
		}
		if keyParts[1] == "ttl" {
			alive, err := parseNgMontioringAliveness(kv.Value)
			if err != nil {
				log.Warn("Ignored invalid NgMonitoring topology TTL entry",
					zap.String("key", key),
					zap.String("value", string(kv.Value)),
					zap.Error(err))
				return "", err
			}
			if !alive {
				log.Warn("Alive of NgMonitoring has expired, maybe local time in different hosts are not synchronized",
					zap.String("key", key),
					zap.String("value", string(kv.Value)))
				return "", ErrInstanceNotAlive.NewWithNoMessage()
			}
			return keyParts[0], nil
		}
	}
	return "", nil
}

func parseNgMontioringAliveness(value []byte) (bool, error) {
	unixTimestampNano, err := strconv.ParseUint(string(value), 10, 64)
	if err != nil {
		return false, ErrInvalidTopologyData.Wrap(err, "NgMonitoring TTL info parse failed")
	}
	t := time.Unix(0, int64(unixTimestampNano))
	if time.Since(t) > time.Second*90 {
		return false, nil
	}
	return true, nil
}
