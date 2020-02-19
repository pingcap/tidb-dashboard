package clusterinfo

import (
	"context"
	"encoding/json"
	"github.com/coreos/etcd/clientv3"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
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
	resp, err := service.etcdCli.Get(ctx, prefix, clientv3.WithPrefix())
	if err != nil {
		// put error in ctx and return
	}
	for _, kvs := range resp.Kvs {
		key := string(kvs.Key)
		keyParts := strings.Split(key,"/")
		if len(keyParts) < 2 {
			continue
		}
		switch keyParts[1] {
		case "grafana":
			parseJson(kvs.Value, &info.grafana)
		case "alertmanager":
			parseJson(kvs.Value, &info.alertManager)
		case "prometheus":
			parseJson(kvs.Value, &info.prom)
		case "tidb":
			// the key should be like /topology/tidb/ip:port/info or /ttl
			if len(keyParts) != 4 {
				continue
			}
			if keyParts[3] == "ttl" {
				info.tidb.ServerStatus = "alive"
			} else {
				// keyParts[3] == "tidb"
				// It's ip:port style
				pair := strings.Split(keyParts[2], ":")
				if len(pair) != 2 {
					// TODO: raise an error
				}
				info.tidb.IP = pair[0]
				info.tidb.Port, err = strconv.ParseUint(pair[1], 10, 32)
				if err != nil {
					// TODO: raise an error
				}
				parseJson(kvs.Value, &info.tidb)
			}
		}
	}
}

func parseJson(data []byte, obj interface{}) error {
	return json.Unmarshal(data, obj)
}

type PDFetcher struct {

}

func (P PDFetcher) Fetch(ctx context.Context, info *ClusterInfo, service *Service) {
	resp, err := http.Get(s.config.PDEndPoint + "/pd/api/v1/members")
	if err != nil {
		// TODO: handle
		return
	}
	if resp.StatusCode != 200 {
		// TODO: add handling logic
	}
	data, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		// TODO: handle
		return
	}

	ds := struct {
		Members []struct {
			ClientUrls []string `json:"client_urls"`
		} `json:"members"`
	}{}

	err = json.Unmarshal(data, &ds)
	if err != nil {
		// TODO: handle
	}
	rets := make([]string, 0)
	for _, ds := range ds.Members {
		rets = append(rets, ds.ClientUrls...)
	}
	// TODO: parse
}
