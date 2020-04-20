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

type ClusterInfo struct {
	TiDB struct {
		Nodes []clusterinfo.TiDBInfo `json:"nodes"`
		Err   *string                `json:"err"`
	} `json:"tidb"`

	TiKV struct {
		Nodes []clusterinfo.TiKVInfo `json:"nodes"`
		Err   *string                `json:"err"`
	} `json:"tikv"`

	PD struct {
		Nodes []clusterinfo.PDInfo `json:"nodes"`
		Err   *string              `json:"err"`
	} `json:"pd"`

	TiFlash struct {
		Nodes []clusterinfo.TiFlashInfo `json:"nodes"`
		Err   *string                   `json:"err"`
	} `json:"tiflash"`

	Grafana      *clusterinfo.GrafanaInfo      `json:"grafana"`
	AlertManager *clusterinfo.AlertManagerInfo `json:"alert_manager"`
}

// fetches etcd, and parses the ns below:
// * /topology/grafana
// * /topology/alertmanager
// * /topology/tidb
func fillTopologyUnderEtcd(ctx context.Context, service *Service, fillTargetInfo *ClusterInfo) {
	tidb, grafana, alertManager, err := clusterinfo.GetTopologyUnderEtcd(ctx, service.etcdClient)
	if err != nil {
		// Note: GetTopology return error only when fetch etcd failed.
		// So it's ok to fill all of them err
		errString := err.Error()
		fillTargetInfo.TiDB.Err = &errString
		return
	}
	if grafana != nil {
		fillTargetInfo.Grafana = grafana
	}
	if alertManager != nil {
		fillTargetInfo.AlertManager = alertManager
	}
	//if len(tidb) == 0 {
	//	tidb, err = clusterinfo.GetTiDBTopologyFromOld(ctx, service.etcdClient)
	//	if err != nil {
	//		errString := err.Error()
	//		fillTargetInfo.TiDB.Err = &errString
	//		return
	//	}
	//}
	fillTargetInfo.TiDB.Nodes = tidb
}

func fillPDTopology(ctx context.Context, service *Service, fillTargetInfo *ClusterInfo) {
	pdPeers, err := clusterinfo.GetPDTopology(service.config.PDEndPoint, service.httpClient)
	if err != nil {
		errString := err.Error()
		fillTargetInfo.PD.Err = &errString
		return
	}
	fillTargetInfo.PD.Nodes = pdPeers
}

func fillStoreTopology(ctx context.Context, service *Service, fillTargetInfo *ClusterInfo) {
	kv, tiflashes, err := clusterinfo.GetStoreTopology(service.config.PDEndPoint, service.httpClient)
	if err != nil {
		errString := err.Error()
		fillTargetInfo.TiKV.Err = &errString
		fillTargetInfo.TiFlash.Err = &errString
		return
	}
	fillTargetInfo.TiKV.Nodes = kv
	fillTargetInfo.TiFlash.Nodes = tiflashes
}
