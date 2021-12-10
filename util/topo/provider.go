// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package topo

type TopologyProvider interface {
	GetPD() ([]PDInfo, error)
	GetTiDB() ([]TiDBInfo, error)
	GetTiKV() ([]StoreInfo, error)
	GetTiFlash() ([]StoreInfo, error)
	GetPrometheus() (*PrometheusInfo, error)
	GetGrafana() (*GrafanaInfo, error)
	GetAlertManager() (*AlertManagerInfo, error)
}
