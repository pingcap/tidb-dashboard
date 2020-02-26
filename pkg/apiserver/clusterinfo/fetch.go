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

// fetcher is an interface for concurrently fetch data and store it in `info`.
type fetcher interface {
	// fetch fetches the data, and if any unrecoverable error exists.
	fetch(ctx context.Context, info *clusterinfo.ClusterInfo, service *Service)
	name() string
}

// etcdFetcher fetches etcd, and parses the ns below:
// * /topology/grafana
// * /topology/alertmanager
// * /topology/tidb
type topologyUnderEtcdFetcher struct{}

func (f topologyUnderEtcdFetcher) name() string {
	return "tidb"
}

func (f topologyUnderEtcdFetcher) fetch(ctx context.Context, info *clusterinfo.ClusterInfo, service *Service) {
	tidb, grafana, alertManager, err := clusterinfo.GetTopologyUnderEtcd(ctx, service.etcdCli)
	if err != nil {
		// Note: GetTopology return error only when fetch etcd failed.
		// So it's ok to fill all of them err
		info.TiDB.Err = err.Error()
		info.TiDB.Error = err
		info.Grafana.Err = err.Error()
		info.Grafana.Error = err
		info.AlertManager.Err = err.Error()
		info.AlertManager.Error = err
		return
	}
	info.TiDB.Nodes = tidb
	info.Grafana.Node = grafana
	info.AlertManager.Node = alertManager
}

// PDFetcher using the http to fetch PDMember information from pd endpoint.
type pdFetcher struct {
}

func (p pdFetcher) name() string {
	return "pd"
}

func (p pdFetcher) fetch(ctx context.Context, info *clusterinfo.ClusterInfo, service *Service) {
	pdPeers, err := clusterinfo.GetPDTopology(ctx, service.config.PDEndPoint)
	if err != nil {
		info.Pd.Err = err.Error()
		info.Pd.Error = err
		return
	}
	info.Pd.Nodes = pdPeers
}

// tikvFetcher using the PDClient to fetch tikv(store) information from pd endpoint.
type tikvFetcher struct {
}

func (t tikvFetcher) fetch(ctx context.Context, info *clusterinfo.ClusterInfo, service *Service) {
	kv, err := clusterinfo.GetTiKVTopology(ctx, service.pdCli)
	if err != nil {
		info.TiKV.Err = err.Error()
		info.TiKV.Error = err
		return
	}
	info.TiKV.Nodes = kv
}

func (t tikvFetcher) name() string {
	return "tikv"
}
