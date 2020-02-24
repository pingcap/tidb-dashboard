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
	"encoding/json"
	"strings"

	"github.com/coreos/etcd/clientv3"
	"github.com/pingcap/log"
)

const prefix = "/topology"

func FetchEtcd(ctx context.Context, etcdcli *clientv3.Client) ([]TiDB, Grafana,
	AlertManager, error) {
	resp, err := etcdcli.Get(ctx, prefix, clientv3.WithPrefix())
	if err != nil {
		// put error in ctx and return
		return nil, Grafana{}, AlertManager{}, err
	}
	dbMap := make(map[string]*TiDB)
	var grafana Grafana
	var alertManager AlertManager
	dbList := make([]TiDB, 0)
	for _, kvs := range resp.Kvs {
		key := string(kvs.Key)
		keyParts := strings.Split(key, "/")
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
				log.Warn("/topology/grafana key unmarshal errors")
			}
		case "alertmanager":
			if err = json.Unmarshal(kvs.Value, &alertManager); err != nil {
				log.Warn("/topology/alertmanager key unmarshal errors")
			}
		case "tidb":
			// the key should be like /topology/tidb/ip:port/info or /ttl
			if len(keyParts) != 4 {
				log.Warn("error, should got 4")
				continue
			}
			pair := strings.Split(keyParts[2], ":")
			if len(pair) != 2 {
				log.Warn("error, should got 2")
				continue
			}
			if _, ok := dbMap[keyParts[2]]; !ok {
				dbMap[keyParts[2]] = &TiDB{}
			}
			db := dbMap[keyParts[2]]

			if keyParts[3] == "ttl" {
				db.ServerStatus = "alive"
			} else {
				// keyParts[3] == "info"
				// It's ip:port style
				if err = json.Unmarshal(kvs.Value, db); err != nil {
					log.Warn("/topology/tidb/ip:port/info key unmarshal errors")
				}
				db.IP = pair[0]
				db.Port = pair[1]
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
