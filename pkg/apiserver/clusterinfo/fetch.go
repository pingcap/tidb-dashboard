package clusterinfo

import (
	"context"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/fetcher"
	"github.com/pingcap/log"
)

type Fetcher interface {
	Fetch(ctx context.Context, info *ClusterInfo, service *Service)
}

const prefix = "/topology"

// fetch etcd, and parse the ns below:
// /topology/grafana
// /topology/prometheus
// /topology/alertmanager
//
// /topology/tidb for tidb
type FetchEtcd struct{}

func (f FetchEtcd) Fetch(ctx context.Context, info *ClusterInfo, service *Service) {
	log.Info("Fetch etcd")
	tidb, grafana, alertManager, err := fetcher.FetchEtcd(ctx, service.etcdCli)
	if err != nil {

	}
	info.TiDB = tidb
	info.Grafana = grafana
	info.AlertManager = alertManager
}

type PDFetcher struct {
}

func (P PDFetcher) Fetch(ctx context.Context, info *ClusterInfo, service *Service) {
	log.Info("Fetch PD Message")
}

type TiKVFetcher struct {
}

func (t TiKVFetcher) Fetch(ctx context.Context, info *ClusterInfo, service *Service) {
	log.Info("Fetch TiKV Message")
}
