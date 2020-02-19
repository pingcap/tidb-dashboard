package clusterinfo

import (
	"context"
	"encoding/json"
	"github.com/coreos/etcd/clientv3"
	"github.com/pingcap/log"
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
	log.Info("Fetch etcd")
	resp, err := service.etcdCli.Get(ctx, prefix, clientv3.WithPrefix())
	if err != nil {
		// put error in ctx and return
	}
	for _, kvs := range resp.Kvs {
		key := string(kvs.Key)
		log.Info("Receive key " + key + " and value " + string(kvs.Value))
		keyParts := strings.Split(key, "/")
		log.Info("Keyparts are " + strings.Join(keyParts, " "))
		if keyParts[0] == "" {
			log.Info("Sure, it is.")
			keyParts = keyParts[1:]
		}
		if len(keyParts) < 2 {
			continue
		}
		log.Info(keyParts[1])
		switch keyParts[1] {
		case "grafana":
			parseJson(kvs.Value, &info.Grafana)
		case "alertmanager":
			parseJson(kvs.Value, &info.AlertManager)
		case "prometheus":
			parseJson(kvs.Value, &info.Prom)
		case "tidb":
			// the key should be like /topology/tidb/ip:port/info or /ttl
			if len(keyParts) != 4 {
				continue
			}
			if keyParts[3] == "ttl" {
				info.Tidb.ServerStatus = "alive"
			} else {
				// keyParts[3] == "tidb"
				// It's ip:port style
				pair := strings.Split(keyParts[2], ":")
				if len(pair) != 2 {
					// TODO: raise an error
				}
				info.Tidb.IP = pair[0]
				info.Tidb.Port, err = strconv.ParseUint(pair[1], 10, 32)
				if err != nil {
					// TODO: raise an error
				}
				parseJson(kvs.Value, &info.Tidb)
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
	log.Info("Fetch PD Message")
}

type TiKVFetcher struct {
}

func (t TiKVFetcher) Fetch(ctx context.Context, info *ClusterInfo, service *Service) {
	log.Info("Fetch TiKV Message")
}
