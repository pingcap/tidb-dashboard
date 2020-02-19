package fetcher

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/coreos/etcd/clientv3"
	"github.com/pingcap/log"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/clusterinfo"
)

const prefix = "/topology"

func FetchEtcd(ctx context.Context, etcdcli *clientv3.Client) ([]clusterinfo.TiDB, clusterinfo.Grafana,
	clusterinfo.AlertManager, error) {
	resp, err := etcdcli.Get(ctx, prefix, clientv3.WithPrefix())
	if err != nil {
		// put error in ctx and return
	}
	dbMap := make(map[string]*clusterinfo.TiDB)
	var grafana clusterinfo.Grafana
	var alertManager clusterinfo.AlertManager
	dbList := make([]clusterinfo.TiDB, 0)
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
		log.Info(keyParts[1] + "  " + string(kvs.Value))
		switch keyParts[1] {
		case "grafana":
			if err = json.Unmarshal(kvs.Value, &grafana); err != nil {
				return nil, clusterinfo.Grafana{}, clusterinfo.AlertManager{}, err
			}
		case "alertmanager":
			if err = json.Unmarshal(kvs.Value, &alertManager); err != nil {
				return nil, clusterinfo.Grafana{}, clusterinfo.AlertManager{}, err
			}
		case "tidb":
			// the key should be like /topology/tidb/ip:port/info or /ttl
			if len(keyParts) != 4 {
				log.Info("error, should got 4")
				continue
			}
			pair := strings.Split(keyParts[2], ":")
			if len(pair) != 2 {
				log.Info("error, should got 2")
				continue
			}
			if _, ok := dbMap[keyParts[2]]; !ok {
				dbMap[keyParts[2]] = &clusterinfo.TiDB{}
			}
			db := dbMap[keyParts[2]]

			if keyParts[3] == "ttl" {
				db.ServerStatus = "alive"
			} else {
				// keyParts[3] == "tidb"
				// It's ip:port style
				db.IP = pair[0]
				db.Port = pair[1]

				if err = json.Unmarshal(kvs.Value, db); err != nil {
					return nil, clusterinfo.Grafana{}, clusterinfo.AlertManager{}, err
				}
			}
		}
	}

	for _, v := range dbMap {
		if v.ServerStatus != "alive" {
			v.ServerStatus = "dead"
		}
		dbList = append(dbList, *v)
	}

	return dbList, grafana, alertManager, nil
}
