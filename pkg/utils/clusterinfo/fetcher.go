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
	"strconv"
	"strings"

	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
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
			keyParts = keyParts[1:]
		}
		if len(keyParts) < 2 {
			continue
		}
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
				log.Warn("error, key under `/topology/tidb` should be like" +
					" `/topology/tidb/ip:port/info`")
				continue
			}
			// parsing ip and port
			pair := strings.Split(keyParts[2], ":")
			if len(pair) != 2 {
				log.Warn("the ns under \"/topology/tidb\" should be like ip:port")
				continue
			}
			ip := strings.Trim(pair[0], "")
			port, _ := strconv.Atoi(pair[1])

			if _, ok := dbMap[keyParts[2]]; !ok {
				dbMap[keyParts[2]] = &TiDB{}
			}
			db := dbMap[keyParts[2]]

			if keyParts[3] == "ttl" {
				db.ServerStatus = Up
			} else {
				// keyParts[3] == "info"
				if err = json.Unmarshal(kvs.Value, db); err != nil {
					log.Warn("/topology/tidb/ip:port/info key unmarshal errors")
				}
				db.IP = ip
				db.Port = uint(port)
			}
		}
	}

	// Note: it means this TiDB has non-ttl key, but ttl-key not exists.
	for _, v := range dbMap {
		if v.ServerStatus != Up {
			v.ServerStatus = Offline
		}
		dbList = append(dbList, *v)
	}

	return dbList, grafana, alertManager, nil
}
