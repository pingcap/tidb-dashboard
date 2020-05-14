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

package topology

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"sort"

	"github.com/pingcap/log"
	"go.uber.org/zap"
)

func FetchPDTopology(pdEndPoint string, httpClient *http.Client) ([]PDInfo, error) {
	nodes := make([]PDInfo, 0)
	healthMap, err := fetchPDHealth(pdEndPoint, httpClient)
	if err != nil {
		return nil, err
	}

	resp, err := httpClient.Get(pdEndPoint + "/pd/api/v1/members")
	if err != nil {
		return nil, ErrPDAccessFailed.Wrap(err, "PD members API HTTP get failed")
	}
	defer resp.Body.Close()
	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, ErrPDAccessFailed.Wrap(err, "PD members API read failed")
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
		return nil, ErrInvalidTopologyData.Wrap(err, "PD members API unmarshal failed")
	}

	for _, ds := range ds.Members {
		u := ds.ClientUrls[0]
		host, port, err := parseHostAndPortFromAddressURL(u)
		if err != nil {
			continue
		}

		ts, err := fetchPDStartTimestamp(u, httpClient)
		if err != nil {
			log.Warn("Failed to fetch PD start timestamp", zap.String("targetPdNode", u), zap.Error(err))
			ts = 0
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

	sort.Slice(nodes, func(i, j int) bool {
		return nodes[i].IP > nodes[j].IP && nodes[i].Port > nodes[j].Port
	})

	return nodes, nil
}

func fetchPDStartTimestamp(pdEndPoint string, httpClient *http.Client) (int64, error) {
	resp, err := httpClient.Get(pdEndPoint + "/pd/api/v1/status")
	if err != nil {
		return 0, ErrPDAccessFailed.Wrap(err, "PD status API HTTP get failed")
	}
	defer resp.Body.Close()
	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return 0, ErrPDAccessFailed.Wrap(err, "PD status API read failed")
	}

	ds := struct {
		StartTimestamp int64 `json:"start_timestamp"`
	}{}
	err = json.Unmarshal(data, &ds)
	if err != nil {
		return 0, ErrInvalidTopologyData.Wrap(err, "PD status API unmarshal failed")
	}

	return ds.StartTimestamp, nil
}

func fetchPDHealth(pdEndPoint string, httpClient *http.Client) (map[string]struct{}, error) {
	// health member set
	memberHealth := map[string]struct{}{}
	resp, err := httpClient.Get(pdEndPoint + "/pd/api/v1/health")
	if err != nil {
		return nil, ErrPDAccessFailed.Wrap(err, "PD health API HTTP get failed")
	}
	defer resp.Body.Close()
	data, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		return nil, ErrPDAccessFailed.Wrap(err, "PD health API read failed")
	}

	var healths []struct {
		MemberID json.Number `json:"member_id"`
	}

	err = json.Unmarshal(data, &healths)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "PD health API unmarshal failed")
	}

	for _, v := range healths {
		memberHealth[v.MemberID.String()] = struct{}{}
	}
	return memberHealth, nil
}
