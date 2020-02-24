package clusterinfo

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"

	"github.com/pingcap/log"
	"github.com/pkg/errors"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/clusterinfo"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/fetcher"
)

type Fetcher interface {
	Fetch(ctx context.Context, info *ClusterInfo, service *Service) error
}

// fetch etcd, and parse the ns below:
// * /topology/grafana
// * /topology/prometheus
// * /topology/alertmanager
// * /topology/tidb for tidb
type FetchEtcd struct{}

func (f FetchEtcd) Fetch(ctx context.Context, info *ClusterInfo, service *Service) error {
	tidb, grafana, alertManager, err := fetcher.FetchEtcd(ctx, service.etcdCli)
	if err != nil {
		return err
	}
	info.TiDB = tidb
	info.Grafana = grafana
	info.AlertManager = alertManager
	return nil
}

type PDFetcher struct {
}

func (P PDFetcher) Fetch(ctx context.Context, info *ClusterInfo, service *Service) error {
	resp, err := http.Get(service.config.PDEndPoint + "/pd/api/v1/members")
	if err != nil {
		return err
	}
	if resp.StatusCode != 200 {
		return errors.New("fetch-failed")
	}
	data, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		return err
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
		return err
	}
	for _, ds := range ds.Members {
		u, err := url.Parse(ds.ClientUrls[0])
		if err != nil {
			return err
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
	return nil
}

type TiKVFetcher struct {
}

func (t TiKVFetcher) Fetch(ctx context.Context, info *ClusterInfo, service *Service) error {
	log.Info("Fetch TiKV Message")

	stores, err := service.pdCli.GetAllStores(ctx)
	if err != nil {
		return err
	}
	for _, v := range stores {
		// parse ip and port
		addresses := strings.Split(v.Address, ":")

		currentInfo := clusterinfo.TiKV{
			ServerVersionInfo: clusterinfo.ServerVersionInfo{
				Version: v.Version,
				GitHash: v.GitHash,
			},
			ServerStatus: "",
			IP:           addresses[0],
			Port:         addresses[1],
			BinaryPath:   v.BinaryPath,
			StatusPort:   v.StatusAddress,
			Labels:       map[string]string{},
		}
		for _, v := range v.Labels {
			currentInfo.Labels[v.Key] = currentInfo.Labels[v.Value]
		}
		info.TiKV = append(info.TiKV, currentInfo)
	}
	return nil
}
