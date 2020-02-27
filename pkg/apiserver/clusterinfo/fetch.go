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

package clusterinfo

import (
	"context"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/clusterinfo"
)

// fetches etcd, and parses the ns below:
// * /topology/grafana
// * /topology/alertmanager
// * /topology/tidb
func getTopologyUnderEtcd(ctx context.Context, info *ClusterInfo, service *Service) {
	tidb, grafana, alertManager, err := clusterinfo.GetTopologyUnderEtcd(ctx, service.etcdCli)
	info.AlertManager = new(AlertManagerField)
	info.Grafana = new(GrafanaField)
	if err != nil {
		// Note: GetTopology return error only when fetch etcd failed.
		// So it's ok to fill all of them err
		info.TiDB.Err = new(string)
		*info.TiDB.Err = err.Error()

		info.Grafana.Err = new(string)
		*info.Grafana.Err = err.Error()

		info.AlertManager.Err = new(string)
		*info.AlertManager.Err = err.Error()
		return
	}
	if grafana == nil && info.Grafana.Err == nil {
		info.Grafana = nil
	} else {
		info.Grafana.Node = grafana
	}
	if alertManager == nil && info.AlertManager.Err == nil {
		info.AlertManager = nil
	} else {
		info.AlertManager.Node = alertManager
	}
	info.TiDB.Nodes = tidb
}

func getPDTopology(ctx context.Context, info *ClusterInfo, service *Service) {
	pdPeers, err := clusterinfo.GetPDTopology(ctx, service.config.PDEndPoint, service.httpClient)
	if err != nil {
		info.Pd.Err = new(string)
		*info.Pd.Err = err.Error()
		return
	}
	info.Pd.Nodes = pdPeers
}

func getTiKVTopology(ctx context.Context, info *ClusterInfo, service *Service) {
	kv, err := clusterinfo.GetTiKVTopology(ctx, service.config.PDEndPoint, service.httpClient)
	if err != nil {
		info.TiKV.Err = new(string)
		*info.TiKV.Err = err.Error()
		return
	}
	info.TiKV.Nodes = kv
}
