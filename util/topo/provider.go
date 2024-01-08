// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"context"
)

// TopologyProvider provides the topology information for different components.
type TopologyProvider interface {
	GetPD(ctx context.Context) ([]PDInfo, error)
	GetTiDB(ctx context.Context) ([]TiDBInfo, error)
	GetTiKV(ctx context.Context) ([]TiKVStoreInfo, error)
	GetTiFlash(ctx context.Context) ([]TiFlashStoreInfo, error)
	GetPrometheus(ctx context.Context) (*PrometheusInfo, error)
	GetGrafana(ctx context.Context) (*GrafanaInfo, error)
	GetAlertManager(ctx context.Context) (*AlertManagerInfo, error)
}

//go:generate mockery --name TopologyProvider --inpackage
var _ TopologyProvider = (*MockTopologyProvider)(nil)
