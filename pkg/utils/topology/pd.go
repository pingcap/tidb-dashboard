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
	"sort"
	"strings"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/utils/host"
)

func FetchPDTopology(pdClient *pd.Client) ([]PDInfo, error) {
	nodes := make([]PDInfo, 0)
	healthMap, err := fetchPDHealth(pdClient)
	if err != nil {
		return nil, err
	}

	resp, err := pdClient.NewRequest().Get("/members")
	if err != nil {
		return nil, err
	}
	ds := struct {
		Count   int `json:"count"`
		Members []struct {
			GitHash       string   `json:"git_hash"`
			ClientUrls    []string `json:"client_urls"`
			DeployPath    string   `json:"deploy_path"`
			BinaryVersion string   `json:"binary_version"`
			MemberID      uint64   `json:"member_id"`
		} `json:"members"`
	}{}

	err = json.Unmarshal(resp.Body(), &ds)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "PD members API unmarshal failed")
	}

	for _, ds := range ds.Members {
		u := ds.ClientUrls[0]
		hostname, port, err := host.ParseHostAndPortFromAddressURL(u)
		if err != nil {
			continue
		}

		ts, err := fetchPDStartTimestamp(pdClient)
		if err != nil {
			log.Warn("Failed to fetch PD start timestamp", zap.String("targetPdNode", u), zap.Error(err))
			ts = 0
		}

		var storeStatus ComponentStatus
		if _, ok := healthMap[ds.MemberID]; ok {
			storeStatus = ComponentStatusUp
		} else {
			storeStatus = ComponentStatusUnreachable
		}

		nodes = append(nodes, PDInfo{
			GitHash:        ds.GitHash,
			Version:        ds.BinaryVersion,
			IP:             hostname,
			Port:           port,
			DeployPath:     ds.DeployPath,
			Status:         storeStatus,
			StartTimestamp: ts,
		})
	}

	sort.Slice(nodes, func(i, j int) bool {
		if nodes[i].IP < nodes[j].IP {
			return true
		}
		if nodes[i].IP > nodes[j].IP {
			return false
		}
		return nodes[i].Port < nodes[j].Port
	})

	return nodes, nil
}

func fetchPDStartTimestamp(pdClient *pd.Client) (int64, error) {
	resp, err := pdClient.NewRequest().Get("/status")
	if err != nil {
		return 0, err
	}

	ds := struct {
		StartTimestamp int64 `json:"start_timestamp"`
	}{}
	err = json.Unmarshal(resp.Body(), &ds)
	if err != nil {
		return 0, ErrInvalidTopologyData.Wrap(err, "PD status API unmarshal failed")
	}

	return ds.StartTimestamp, nil
}

func fetchPDHealth(pdClient *pd.Client) (map[uint64]struct{}, error) {
	resp, err := pdClient.NewRequest().Get("/health")
	if err != nil {
		return nil, err
	}

	var healths []struct {
		MemberID uint64 `json:"member_id"`
		Health   bool   `json:"health"`
	}

	err = json.Unmarshal(resp.Body(), &healths)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "PD health API unmarshal failed")
	}

	memberHealth := map[uint64]struct{}{}
	for _, v := range healths {
		if v.Health {
			memberHealth[v.MemberID] = struct{}{}
		}
	}
	return memberHealth, nil
}

func fetchLocationLabels(pdClient *pd.Client) ([]string, error) {
	resp, err := pdClient.NewRequest().Get("/config/replicate")
	if err != nil {
		return nil, err
	}

	var replicateConfig struct {
		LocationLabels string `json:"location-labels"`
	}
	err = json.Unmarshal(resp.Body(), &replicateConfig)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "PD config/replicate API unmarshal failed")
	}
	labels := strings.Split(replicateConfig.LocationLabels, ",")
	return labels, nil
}
