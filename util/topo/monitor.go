// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"context"

	"go.etcd.io/etcd/clientv3"
)

func GetAlertManagerInstance(ctx context.Context, etcdClient *clientv3.Client) (*AlertManagerInfo, error) {
	i, err := fetchStandardComponentTopology(ctx, "alertmanager", etcdClient)
	if err != nil {
		return nil, err
	}
	if i == nil {
		return nil, nil
	}
	return (*AlertManagerInfo)(i), nil
}

func GetGrafanaInstance(ctx context.Context, etcdClient *clientv3.Client) (*GrafanaInfo, error) {
	i, err := fetchStandardComponentTopology(ctx, "grafana", etcdClient)
	if err != nil {
		return nil, err
	}
	if i == nil {
		return nil, nil
	}
	return (*GrafanaInfo)(i), nil
}

func GetPrometheusInstance(ctx context.Context, etcdClient *clientv3.Client) (*PrometheusInfo, error) {
	i, err := fetchStandardComponentTopology(ctx, "prometheus", etcdClient)
	if err != nil {
		return nil, err
	}
	if i == nil {
		return nil, nil
	}
	return (*PrometheusInfo)(i), nil
}
