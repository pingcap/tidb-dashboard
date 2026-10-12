// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package topology

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/pingcap/log"
	"go.etcd.io/etcd/api/v3/mvccpb"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/distro"
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

const ngMonitoringDashboardAuthScheme = "token-v1"

type NgMonitoringTopology struct {
	Address            string
	DashboardAuthToken string
}

type ngMonitoringServerInfo struct {
	DashboardAuth *ngMonitoringDashboardAuth `json:"dashboard_auth"`
}

type ngMonitoringDashboardAuth struct {
	Scheme string `json:"scheme"`
	Token  string `json:"token"`
}

func FetchNgMonitoringTopology(ctx context.Context, etcdClient *clientv3.Client) (string, error) {
	topology, err := FetchNgMonitoringTopologyInfo(ctx, etcdClient)
	if err != nil || topology == nil {
		return "", err
	}
	return topology.Address, nil
}

// FetchNgMonitoringTopologyInfo returns both the ng-monitoring address and
// optional capabilities advertised by newer ng-monitoring versions. Keeping
// FetchNgMonitoringTopology above preserves compatibility for existing callers.
func FetchNgMonitoringTopologyInfo(ctx context.Context, etcdClient *clientv3.Client) (*NgMonitoringTopology, error) {
	ctx2, cancel := context.WithTimeout(ctx, defaultFetchTimeout)
	defer cancel()

	resp, err := etcdClient.Get(ctx2, ngMonitoringKeyPrefix, clientv3.WithPrefix())
	if err != nil {
		return nil, ErrEtcdRequestFailed.Wrap(err, "failed to get key %s from %s etcd", ngMonitoringKeyPrefix, distro.R().PD)
	}
	return parseNgMonitoringTopology(resp.Kvs)
}

func parseNgMonitoringTopology(kvs []*mvccpb.KeyValue) (*NgMonitoringTopology, error) {
	serverInfoByAddress := make(map[string]ngMonitoringServerInfo)
	for _, kv := range kvs {
		key := string(kv.Key)
		if !strings.HasPrefix(key, ngMonitoringKeyPrefix) {
			continue
		}
		// RemainingKey looks like `ip:port/info` or `ip:port/ttl`.
		remainingKey := key[len(ngMonitoringKeyPrefix):]
		keyParts := strings.Split(remainingKey, "/")
		if len(keyParts) != 2 {
			log.Warn("Ignored invalid topology key", zap.String("component", "ng-monitoring"), zap.String("key", key))
			continue
		}
		if keyParts[1] == "info" {
			var info ngMonitoringServerInfo
			if err := json.Unmarshal(kv.Value, &info); err != nil {
				// Older versions did not consume this entry. Ignore malformed or
				// unknown info to retain their address-only discovery behavior.
				log.Warn("Ignored invalid NgMonitoring topology info entry",
					zap.String("key", key),
					zap.Error(err))
				continue
			}
			serverInfoByAddress[keyParts[0]] = info
		}
	}

	for _, kv := range kvs {
		key := string(kv.Key)
		if !strings.HasPrefix(key, ngMonitoringKeyPrefix) {
			continue
		}
		remainingKey := key[len(ngMonitoringKeyPrefix):]
		keyParts := strings.Split(remainingKey, "/")
		if len(keyParts) == 2 && keyParts[1] == "ttl" {
			_, err := parseNgMontioringAliveness(kv.Value)
			if err != nil {
				log.Warn("Ignored invalid NgMonitoring topology TTL entry",
					zap.String("key", key),
					zap.String("value", string(kv.Value)),
					zap.Error(err))
				return nil, err
			}
			// Currently ttl value is not refreshed periodically in the NgMonitoring side
			// if !alive {
			// 	log.Warn("Alive of NgMonitoring has expired, maybe local time in different hosts are not synchronized",
			// 		zap.String("key", key),
			// 		zap.String("value", string(kv.Value)))
			// 	return "", ErrInstanceNotAlive.NewWithNoMessage()
			// }
			serverInfo := serverInfoByAddress[keyParts[0]]
			dashboardAuthToken := ""
			if serverInfo.DashboardAuth != nil {
				if serverInfo.DashboardAuth.Scheme != ngMonitoringDashboardAuthScheme || serverInfo.DashboardAuth.Token == "" {
					return nil, ErrInvalidTopologyData.New("unsupported or incomplete NgMonitoring dashboard authentication info")
				}
				dashboardAuthToken = serverInfo.DashboardAuth.Token
			}
			return &NgMonitoringTopology{Address: keyParts[0], DashboardAuthToken: dashboardAuthToken}, nil
		}
	}
	return nil, nil
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
