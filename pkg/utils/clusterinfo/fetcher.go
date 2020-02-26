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
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/pingcap/kvproto/pkg/metapb"
	pdclient "github.com/pingcap/pd/client"
	"go.uber.org/zap"

	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
)

const prefix = "/topology"
const RFCTime = "2006-01-02 15:04:05.999999999 -0700 MST"

// GetTopology return error only when fetch etcd failed.
func GetTopologyUnderEtcd(ctx context.Context, etcdcli *clientv3.Client) ([]TiDB, Grafana,
	AlertManager, error) {
	resp, err := etcdcli.Get(ctx, prefix, clientv3.WithPrefix())
	if err != nil {
		// put error in ctx and return
		return nil, Grafana{}, AlertManager{}, err
	}
	var grafana Grafana
	var alertManager AlertManager
	ttlMap := map[string][]byte{}
	infoMap := map[string]*TiDB{}
	for _, kvs := range resp.Kvs {
		key := string(kvs.Key)

		keyParts := strings.Split(key, "/")[1:]
		if len(keyParts) < 2 {
			continue
		}
		// There can be four kinds of keys:
		// * /topology/grafana: stores grafana topology info.
		// * /topology/alertmanager: stores alertmanager topology info.
		// * /topology/tidb/ip:port/info: stores tidb topology info.
		// * /topology/tidb/ip:port/ttl : stores tidb last update ttl time.
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
			address, fieldType := keyParts[2], keyParts[3]
			fillDBMap(address, fieldType, kvs.Value, infoMap, ttlMap)
		}
	}

	return genDBList(infoMap, ttlMap), grafana, alertManager, nil
}

func GetTiDBTopology(ctx context.Context, etcdcli *clientv3.Client) ([]TiDB, error) {
	resp, err := etcdcli.Get(ctx, prefix+"/tidb", clientv3.WithPrefix())
	if err != nil {
		return nil, err
	}
	ttlMap := map[string][]byte{}
	infoMap := map[string]*TiDB{}
	for _, kvs := range resp.Kvs {
		key := string(kvs.Key)

		keyParts := strings.Split(key, "/")[2:]
		if len(keyParts) < 2 {
			continue
		}
		address, fieldType := keyParts[0], keyParts[1]
		fillDBMap(address, fieldType, kvs.Value, infoMap, ttlMap)
	}

	return genDBList(infoMap, ttlMap), nil
}

// address should be like "ip:port"
// fieldType should be "ttl" or "info"
// value is field value.
func fillDBMap(address, fieldType string, value []byte, infoMap map[string]*TiDB, ttlMap map[string][]byte) {
	if fieldType == "ttl" {
		ttlMap[address] = value
	} else if fieldType == "info" {
		var currentInfo TiDB
		err := json.Unmarshal(value, &currentInfo)
		if err != nil {
			return
		}
		ipAndPort := strings.Split(address, ":")
		currentInfo.IP = ipAndPort[0]
		currentInfo.Port = atoiOrZero(ipAndPort[1])
		infoMap[address] = &currentInfo
	}
}

func genDBList(infoMap map[string]*TiDB, ttlMap map[string][]byte) []TiDB {
	dbList := []TiDB{}
	// Note: it means this TiDB has non-ttl key, but ttl-key not exists.
	for address, info := range infoMap {
		if ttlFreshTime, ok := ttlMap[address]; ok {
			recTime, err := time.Parse(RFCTime, string(ttlFreshTime))
			if err != nil {
				info.ServerStatus = Offline
			} else if time.Since(recTime) > time.Second*30 {
				info.ServerStatus = Offline
			} else {
				info.ServerStatus = Up
			}
		} else {
			info.ServerStatus = Offline
		}
		dbList = append(dbList, *info)
	}

	return dbList
}

func GetTiKVTopology(ctx context.Context, pdcli pdclient.Client) ([]TiKV, error) {
	kvs := make([]TiKV, 0)
	stores, err := pdcli.GetAllStores(ctx)

	if err != nil {
		return nil, err
	}
	for _, v := range stores {
		// parse ip and port
		ipAndPort := strings.Split(v.Address, ":")
		port := atoiOrZero(ipAndPort[1])
		// Note: if err exists, it just return 0.
		_, statusPort, _ := parsePortFromAddress(v.StatusAddress)
		currentInfo := TiKV{
			ComponentVersionInfo: ComponentVersionInfo{
				Version: v.Version,
				GitHash: v.GitHash,
			},
			IP:           ipAndPort[0],
			Port:         port,
			BinaryPath:   v.BinaryPath,
			ServerStatus: storeStateToStatus(v.GetState()),
			StatusPort:   statusPort,
			Labels:       map[string]string{},
		}
		for _, v := range v.Labels {
			currentInfo.Labels[v.Key] = currentInfo.Labels[v.Value]
		}
		kvs = append(kvs, currentInfo)
	}

	return kvs, nil
}

func GetPDTopology(ctx context.Context, pdEndPoint string) ([]PD, error) {
	pdPeers := make([]PD, 0)
	healthMapChan := make(chan map[string]struct{})
	go func() {
		var err error
		healthMap, err := getPDNodesHealth(pdEndPoint)
		if err != nil {
			healthMap = map[string]struct{}{}
		}
		healthMapChan <- healthMap
	}()

	resp, err := http.Get(pdEndPoint + "/pd/api/v1/members")
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("fetch PD members got wrong status code")
	}
	data, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		return nil, err
	}

	ds := struct {
		Count   int `json:"count"`
		Members []struct {
			ClientUrls    []string    `json:"client_urls"`
			BinaryPath    string      `json:"binary_path"`
			BinaryVersion string      `json:"binary_version"`
			MemberID      json.Number `json:"member_id"`
		} `json:"members"`
	}{}

	err = json.Unmarshal(data, &ds)
	if err != nil {
		return nil, err
	}

	healthMap := <-healthMapChan
	for _, ds := range ds.Members {
		host, port, err := parsePortFromAddress(ds.ClientUrls[0])
		if err != nil {
			return nil, err
		}
		var storeStatus ComponentStatus
		if _, ok := healthMap[ds.MemberID.String()]; ok {
			storeStatus = Up
		} else {
			storeStatus = Offline
		}

		pdPeers = append(pdPeers, PD{
			ComponentVersionInfo: ComponentVersionInfo{
				Version: ds.BinaryVersion,
			},
			IP:           host,
			Port:         port,
			BinaryPath:   ds.BinaryPath,
			ServerStatus: storeStatus,
		})
	}
	return pdPeers, nil
}

// parsePortFromAddress receive two kind of address
// 1. ip:port, like "127.0.0.1:2379"
// 2. protocol://ip:port
// and returns the (ip, port number).
func parsePortFromAddress(address string) (string, uint, error) {
	var statusPort int
	u, err := url.Parse(address)
	if err != nil {
		// https://github.com/golang/go/issues/18824
		if strings.HasPrefix(address, "//") {
			log.Warn("parsePortFromAddress parsing address error", zap.Error(err))
			return "", 0, err
		}
		return parsePortFromAddress("//" + address)
	}
	statusPort, err = strconv.Atoi(u.Port())
	if err != nil {
		log.Warn("parsePortFromAddress parsing port error", zap.Error(err))
		return "", 0, err
	}
	return u.Host, uint(statusPort), nil
}

func atoiOrZero(port string) uint {
	var statusPort int
	var err error
	if statusPort, err = strconv.Atoi(port); err != nil {
		log.Warn("parsePort parsing port error", zap.Error(err))
		return 0
	}
	return uint(statusPort)
}

func storeStateToStatus(state metapb.StoreState) ComponentStatus {
	switch state {
	case metapb.StoreState_Up:
		return Up
	case metapb.StoreState_Offline:
		return Offline
	case metapb.StoreState_Tombstone:
		return Tombstone
	default:
		return Unknown
	}
}

func getPDNodesHealth(pdEndPoint string) (map[string]struct{}, error) {
	// health member set
	healthMember := map[string]struct{}{}

	resp, err := http.Get(pdEndPoint + "/pd/api/v1/health")
	if err != nil {
		return nil, err
	}
	data, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		return nil, err
	}

	var healths []struct {
		MemberID json.Number `json:"member_id"`
	}

	err = json.Unmarshal(data, &healths)
	if err != nil {
		return nil, err
	}

	for _, v := range healths {
		healthMember[v.MemberID.String()] = struct{}{}
	}
	return healthMember, nil
}
