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

	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/zap"
)

// GetTopology return error only when fetch etcd failed.
func GetTopologyUnderEtcd(ctx context.Context, etcdClient *clientv3.Client) (tidbNodes []TiDBInfo, grafanaNode *GrafanaInfo, alertManagerNode *AlertManagerInfo, e error) {
	resp, err := etcdClient.Get(ctx, "/topology", clientv3.WithPrefix())
	if err != nil {
		return nil, nil, nil, err
	}
	tidbTTLMap := map[string][]byte{}
	tidbEntryMap := map[string]*TiDBInfo{}
	for _, kv := range resp.Kvs {
		keyParts := strings.Split(string(kv.Key), "/")[1:]
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
			r := GrafanaInfo{}
			if err = json.Unmarshal(kv.Value, &r); err != nil {
				continue
			}
			grafanaNode = &r
		case "alertmanager":
			r := AlertManagerInfo{}
			if err = json.Unmarshal(kv.Value, &r); err != nil {
				continue
			}
			alertManagerNode = &r
		case "tidb":
			// the key should be like /topology/tidb/ip:port/info or /ttl
			if len(keyParts) != 4 {
				continue
			}
			address, fieldType := keyParts[2], keyParts[3]
			fillDBMap(address, fieldType, kv.Value, tidbEntryMap, tidbTTLMap)
		}
	}

	tidbNodes = genDBList(tidbEntryMap, tidbTTLMap)

	return tidbNodes, grafanaNode, alertManagerNode, nil
}

// address should be like "ip:port"
// fieldType should be "ttl" or "info"
// value is field value.
func fillDBMap(address, fieldType string, value []byte, infoMap map[string]*TiDBInfo, ttlMap map[string][]byte) {
	if fieldType == "ttl" {
		ttlMap[address] = value
	} else if fieldType == "info" {
		ds := struct {
			Version        string `json:"version"`
			GitHash        string `json:"git_hash"`
			StatusPort     uint   `json:"status_port"`
			DeployPath     string `json:"deploy_path"`
			StartTimestamp int64  `json:"start_timestamp"`
		}{}

		//var currentInfo TiDB
		err := json.Unmarshal(value, &ds)
		if err != nil {
			return
		}
		host, port, err := parseHostAndPortFromAddress(address)
		if err != nil {
			return
		}

		infoMap[address] = &TiDBInfo{
			GitHash:        ds.GitHash,
			Version:        ds.Version,
			IP:             host,
			Port:           port,
			DeployPath:     ds.DeployPath,
			Status:         ComponentStatusUnreachable,
			StatusPort:     ds.StatusPort,
			StartTimestamp: ds.StartTimestamp,
		}
	}
}

func genDBList(infoMap map[string]*TiDBInfo, ttlMap map[string][]byte) []TiDBInfo {
	nodes := make([]TiDBInfo, 0)

	// Note: it means this TiDB has non-ttl key, but ttl-key not exists.
	for address, info := range infoMap {
		if ttlFreshUnixNanoSec, ok := ttlMap[address]; ok {
			unixNano, err := strconv.ParseInt(string(ttlFreshUnixNanoSec), 10, 64)
			if err != nil {
				info.Status = ComponentStatusUnreachable
			} else {
				ttlFreshTime := time.Unix(0, unixNano)
				if time.Since(ttlFreshTime) > time.Second*45 {
					info.Status = ComponentStatusUnreachable
				} else {
					info.Status = ComponentStatusUp
				}
			}
		} else {
			info.Status = ComponentStatusUnreachable
		}
		nodes = append(nodes, *info)
	}

	return nodes
}

type store struct {
	Address string `json:"address"`
	ID      int    `json:"id"`
	Labels  []struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	}
	StateName      string `json:"state_name"`
	Version        string `json:"version"`
	StatusAddress  string `json:"status_address"`
	GitHash        string `json:"git_hash"`
	DeployPath     string `json:"deploy_path"`
	StartTimestamp int64  `json:"start_timestamp"`
}

func getAllStoreNodes(endpoint string, httpClient *http.Client) ([]store, error) {
	resp, err := httpClient.Get(endpoint + "/pd/api/v1/stores")
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("fetch stores got wrong status code")
	}
	defer resp.Body.Close()
	storeResp := struct {
		Count  int `json:"count"`
		Stores []struct {
			Store store
		} `json:"stores"`
	}{}
	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(data, &storeResp)
	if err != nil {
		return nil, err
	}
	ret := make([]store, storeResp.Count)
	for i, s := range storeResp.Stores {
		ret[i] = s.Store
	}
	return ret, nil
}

type tikvStore struct {
	store
}

func getAllTiKVNodes(stores []store) []tikvStore {
	tikvs := make([]tikvStore, len(stores))
	for i := range stores {
		isTiFlash := false
		for _, label := range stores[i].Labels {
			if label.Key == "engine" && label.Value == "tiflash" {
				isTiFlash = true
			}
		}
		if !isTiFlash {
			tikvs = append(tikvs, tikvStore{stores[i]})
		}
	}
	return tikvs
}

func getTiKVTopology(stores []tikvStore) ([]TiKVInfo, error) {
	nodes := make([]TiKVInfo, 0)
	for _, v := range stores {
		// parse ip and port
		host, port, err := parseHostAndPortFromAddress(v.Address)
		if err != nil {
			continue
		}
		_, statusPort, err := parseHostAndPortFromAddress(v.StatusAddress)
		if err != nil {
			continue
		}
		// In current TiKV, it's version may not start with 'v',
		//  so we may need to add a prefix 'v' for it.
		version := strings.Trim(v.Version, "\n ")
		if !strings.HasPrefix(version, "v") {
			version = "v" + version
		}
		node := TiKVInfo{
			Version:        version,
			IP:             host,
			Port:           port,
			GitHash:        v.GitHash,
			DeployPath:     v.DeployPath,
			Status:         storeStateToStatus(v.StateName),
			StatusPort:     statusPort,
			Labels:         map[string]string{},
			StartTimestamp: v.StartTimestamp,
		}
		for _, v := range v.Labels {
			node.Labels[v.Key] = node.Labels[v.Value]
		}
		nodes = append(nodes, node)
	}

	return nodes, nil
}

type tiflashStore struct {
	store
}

func getAllTiFlashNodes(stores []store) []tiflashStore {
	tiflashes := make([]tiflashStore, len(stores))
	for i := range stores {
		for _, label := range stores[i].Labels {
			if label.Key == "engine" && label.Value == "tiflash" {
				tiflashes = append(tiflashes, tiflashStore{stores[i]})
			}
		}
	}

	return tiflashes
}

func getTiFlashTopology(stores []tiflashStore) ([]TiFlashInfo, error) {
	nodes := make([]TiFlashInfo, 0)
	for _, v := range stores {
		// parse ip and port
		host, port, err := parseHostAndPortFromAddress(v.Address)
		if err != nil {
			continue
		}
		_, statusPort, err := parseHostAndPortFromAddress(v.StatusAddress)
		if err != nil {
			continue
		}
		version := strings.Trim(v.Version, "\n ")
		node := TiFlashInfo{
			Version:        version,
			IP:             host,
			Port:           port,
			DeployPath:     v.DeployPath, // TiFlash hasn't BinaryPath for now, so it would be empty
			Status:         storeStateToStatus(v.StateName),
			StatusPort:     statusPort,
			Labels:         map[string]string{},
			StartTimestamp: v.StartTimestamp,
		}
		for _, v := range v.Labels {
			node.Labels[v.Key] = node.Labels[v.Value]
		}
		nodes = append(nodes, node)
	}

	return nodes, nil
}

func GetStoreTopology(endpoint string, httpClient *http.Client) ([]TiKVInfo, []TiFlashInfo, error) {
	stores, err := getAllStoreNodes(endpoint, httpClient)
	if err != nil {
		return nil, nil, err
	}

	tikvStores := getAllTiKVNodes(stores)
	tikvInfos, err := getTiKVTopology(tikvStores)
	if err != nil {
		return nil, nil, err
	}

	tiflashStores := getAllTiFlashNodes(stores)
	tiflashInfos, err := getTiFlashTopology(tiflashStores)
	if err != nil {
		return nil, nil, err
	}

	return tikvInfos, tiflashInfos, nil
}

func GetPDTopology(pdEndPoint string, httpClient *http.Client) ([]PDInfo, error) {
	nodes := make([]PDInfo, 0)
	healthMapChan := make(chan map[string]struct{})
	go func() {
		var err error
		healthMap, err := getPDNodesHealth(pdEndPoint, httpClient)
		if err != nil {
			healthMap = map[string]struct{}{}
		}
		healthMapChan <- healthMap
	}()

	resp, err := httpClient.Get(pdEndPoint + "/pd/api/v1/members")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
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
			GitHash       string      `json:"git_hash"`
			ClientUrls    []string    `json:"client_urls"`
			DeployPath    string      `json:"deploy_path"`
			BinaryVersion string      `json:"binary_version"`
			MemberID      json.Number `json:"member_id"`
		} `json:"members"`
	}{}

	err = json.Unmarshal(data, &ds)
	if err != nil {
		return nil, err
	}

	healthMap := <-healthMapChan
	close(healthMapChan)
	for _, ds := range ds.Members {
		u := ds.ClientUrls[0]
		ts, err := getPDStartTimestamp(u, httpClient)
		if err != nil {
			log.Warn("failed to get PD node status", zap.Error(err))
			continue
		}
		host, port, err := parseHostAndPortFromAddressURL(u)
		if err != nil {
			continue
		}
		var storeStatus ComponentStatus
		if _, ok := healthMap[ds.MemberID.String()]; ok {
			storeStatus = ComponentStatusUp
		} else {
			storeStatus = ComponentStatusUnreachable
		}

		nodes = append(nodes, PDInfo{
			GitHash:        ds.GitHash,
			Version:        ds.BinaryVersion,
			IP:             host,
			Port:           port,
			DeployPath:     ds.DeployPath,
			Status:         storeStatus,
			StartTimestamp: ts,
		})
	}
	return nodes, nil
}

func getPDStartTimestamp(pdEndPoint string, httpClient *http.Client) (int64, error) {
	resp, err := httpClient.Get(pdEndPoint + "/pd/api/v1/status")
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return 0, fmt.Errorf("fetch PD %s status got wrong status code", pdEndPoint)
	}
	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}

	ds := struct {
		StartTimestamp int64 `json:"start_timestamp"`
	}{}
	err = json.Unmarshal(data, &ds)
	if err != nil {
		return 0, err
	}

	return ds.StartTimestamp, nil
}

// address should be like "ip:port" as "127.0.0.1:2379".
// return error if string is not like "ip:port".
func parseHostAndPortFromAddress(address string) (string, uint, error) {
	addresses := strings.Split(address, ":")
	if len(addresses) != 2 {
		return "", 0, fmt.Errorf("invalid address %s", address)
	}
	port, err := strconv.Atoi(addresses[1])
	if err != nil {
		return "", 0, err
	}
	return addresses[0], uint(port), nil
}

// address should be like "protocol://ip:port" as "http://127.0.0.1:2379".
func parseHostAndPortFromAddressURL(urlString string) (string, uint, error) {
	u, err := url.Parse(urlString)
	if err != nil {
		return "", 0, err
	}
	port, err := strconv.Atoi(u.Port())
	if err != nil {
		return "", 0, err
	}
	return u.Hostname(), uint(port), nil
}

func storeStateToStatus(state string) ComponentStatus {
	state = strings.Trim(strings.ToLower(state), "\n ")
	switch state {
	case "up":
		return ComponentStatusUp
	case "tombstone":
		return ComponentStatusTombstone
	case "offline":
		return ComponentStatusOffline
	case "down":
		return ComponentStatusDown
	case "disconnected":
		return ComponentStatusUnreachable
	default:
		return ComponentStatusUnreachable
	}
}

func getPDNodesHealth(pdEndPoint string, httpClient *http.Client) (map[string]struct{}, error) {
	// health member set
	memberHealth := map[string]struct{}{}
	resp, err := httpClient.Get(pdEndPoint + "/pd/api/v1/health")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
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
		memberHealth[v.MemberID.String()] = struct{}{}
	}
	return memberHealth, nil
}

// GetAlertCountByAddress receives alert manager's address like "ip:port", and it returns the
//  alert number of the alert manager.
func GetAlertCountByAddress(address string, httpClient *http.Client) (int, error) {
	ip, port, err := parseHostAndPortFromAddress(address)
	if err != nil {
		return 0, err
	}

	apiAddress := fmt.Sprintf("http://%s:%d/api/v2/alerts", ip, port)
	resp, err := httpClient.Get(apiAddress)
	if err != nil {
		return 0, err
	}

	defer resp.Body.Close()
	data, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		return 0, err
	}

	var alerts []struct{}

	err = json.Unmarshal(data, &alerts)
	if err != nil {
		return 0, err
	}

	return len(alerts), nil
}
