// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package pdtopo

import (
	"context"

	clientv3 "go.etcd.io/etcd/client/v3"

	"github.com/pingcap/tidb-dashboard/util/topo"
)

func GetAlertManagerInstance(ctx context.Context, etcdClient *clientv3.Client) (*topo.AlertManagerInfo, error) {
	i, err := fetchStandardComponentTopology(ctx, "alertmanager", etcdClient)
	if err != nil {
		return nil, err
	}
	if i == nil {
		return nil, nil
	}
	return (*topo.AlertManagerInfo)(i), nil
}

func GetGrafanaInstance(ctx context.Context, etcdClient *clientv3.Client) (*topo.GrafanaInfo, error) {
	i, err := fetchStandardComponentTopology(ctx, "grafana", etcdClient)
	if err != nil {
		return nil, err
	}
	if i == nil {
		return nil, nil
	}
	return (*topo.GrafanaInfo)(i), nil
}

func GetPrometheusInstance(ctx context.Context, etcdClient *clientv3.Client) (*topo.PrometheusInfo, error) {
	i, err := fetchStandardComponentTopology(ctx, "prometheus", etcdClient)
	if err != nil {
		return nil, err
	}
	if i == nil {
		return nil, nil
	}
	return (*topo.PrometheusInfo)(i), nil
}
