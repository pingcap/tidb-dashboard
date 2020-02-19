package clusterinfo

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"

	"github.com/pingcap/log"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/clusterinfo"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/fetcher"
)

type Fetcher interface {
	Fetch(ctx context.Context, info *ClusterInfo, service *Service)
}

const prefix = "/topology"

// fetch etcd, and parse the ns below:
// * /topology/grafana
// * /topology/prometheus
// * /topology/alertmanager
// * /topology/tidb for tidb
type FetchEtcd struct{}

func (f FetchEtcd) Fetch(ctx context.Context, info *ClusterInfo, service *Service) {
	log.Info("Fetch etcd")
	tidb, grafana, alertManager, err := fetcher.FetchEtcd(ctx, service.etcdCli)
	if err != nil {
		log.Fatal(err.Error())
	}
	info.TiDB = tidb
	info.Grafana = grafana
	info.AlertManager = alertManager
}

type PDFetcher struct {
}

func (P PDFetcher) Fetch(ctx context.Context, info *ClusterInfo, service *Service) {
	log.Info("Fetch PD Message")
	resp, err := http.Get(service.config.PDEndPoint + "/pd/api/v1/members")
	if err != nil {
		// TODO: handle error here
		//return nil, err
	}
	if resp.StatusCode != 200 {
		// TODO: add handling logic
	}
	data, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		//return nil, err
	}

	ds := struct {
		Count   int `json:"count"`
		Members []struct {
			ClientUrls    []string `json:"client_urls"`
			DeployPath    string   `json:"deploy_path"`
			BinaryVersion string   `json:"binary_version"`
		} `json:"members"`
	}{}

	err = json.Unmarshal(data, &ds)
	if err != nil {
		//return nil, err
	}
	for _, ds := range ds.Members {
		u, err := url.Parse(ds.ClientUrls[0])
		if err != nil {

		}

		info.Pd = append(info.Pd, clusterinfo.PD{
			DeployCommon: clusterinfo.DeployCommon{
				IP:         u.Hostname(),
				Port:       u.Port(),
				BinaryPath: ds.DeployPath,
			},
			Version:      ds.BinaryVersion,
			ServerStatus: "",
		})
	}
}

type TiKVFetcher struct {
}

func (t TiKVFetcher) Fetch(ctx context.Context, info *ClusterInfo, service *Service) {
	log.Info("Fetch TiKV Message")

	stores, err := service.pdCli.GetAllStores(ctx)
	if err != nil {
		// TODO: handling using ctx
		return
	}
	for _, v := range stores {
		// parse ip and port
		addresses := strings.Split(v.Address, ":")

		info.TiKV = append(info.TiKV, clusterinfo.TiKV{
			ServerVersionInfo: clusterinfo.ServerVersionInfo{
				Version: v.Version,
				GitHash: v.GitHash,
			},
			ServerStatus:  "",
			IP:            addresses[0],
			Port:          addresses[1],
			BinaryPath:    v.BinaryPath,
			StatusAddress: v.StatusAddress,
		})
	}
}
