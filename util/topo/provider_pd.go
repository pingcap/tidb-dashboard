// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"go.etcd.io/etcd/clientv3"

	"github.com/pingcap/tidb-dashboard/util/client/pdclient"
)

type TopologyFromPD struct {
	etcdClient *clientv3.Client
	pdAPI      *pdclient.APIClient
}

var _ TopologyProvider = (*TopologyFromPD)(nil)

func NewTopologyProviderFromPD(etcdClient *clientv3.Client, pdAPI *pdclient.APIClient) *TopologyFromPD {
	return &TopologyFromPD{
		etcdClient: etcdClient,
		pdAPI:      pdAPI,
	}
}

func (p *TopologyFromPD) GetPD() ([]PDInfo, error) {
	return GetPDInstances(p.pdAPI)
}

func (p *TopologyFromPD) GetTiDB() ([]TiDBInfo, error) {
	return GetTiDBInstances(p.etcdClient)
}

func (p *TopologyFromPD) GetTiKV() ([]StoreInfo, error) {

}

func (p *TopologyFromPD) GetTiFlash() ([]StoreInfo, error) {

}

func (p *TopologyFromPD) GetPrometheus() (*PrometheusInfo, error) {

}

func (p *TopologyFromPD) GetGrafana() (*GrafanaInfo, error) {

}

func (p *TopologyFromPD) GetAlertManager() (*AlertManagerInfo, error) {

}
