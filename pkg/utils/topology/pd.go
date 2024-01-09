// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package topology

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/util/distro"
	"github.com/pingcap/tidb-dashboard/util/netutil"
)

func FetchPDTopology(pdClient *pd.Client) ([]PDInfo, error) {
	nodes := make([]PDInfo, 0)
	healthMap, err := fetchPDHealth(pdClient)
	if err != nil {
		return nil, err
	}

	data, err := pdClient.SendGetRequest("/members")
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

	err = json.Unmarshal(data, &ds)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "%s members API unmarshal failed", distro.R().PD)
	}

	for _, ds := range ds.Members {
		u := ds.ClientUrls[0]
		hostname, port, err := netutil.ParseHostAndPortFromAddressURL(u)
		if err != nil {
			continue
		}

		ts, err := fetchPDStartTimestamp(pdClient)
		if err != nil {
			log.Warn(fmt.Sprintf("Failed to fetch %s start timestamp", distro.R().PD), zap.String("targetPdNode", u), zap.Error(err))
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
	data, err := pdClient.SendGetRequest("/status")
	if err != nil {
		return 0, err
	}

	ds := struct {
		StartTimestamp int64 `json:"start_timestamp"`
	}{}
	err = json.Unmarshal(data, &ds)
	if err != nil {
		return 0, ErrInvalidTopologyData.Wrap(err, "%s status API unmarshal failed", distro.R().PD)
	}

	return ds.StartTimestamp, nil
}

func fetchPDHealth(pdClient *pd.Client) (map[uint64]struct{}, error) {
	data, err := pdClient.SendGetRequest("/health")
	if err != nil {
		return nil, err
	}

	var healths []struct {
		MemberID uint64 `json:"member_id"`
		Health   bool   `json:"health"`
	}

	err = json.Unmarshal(data, &healths)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "%s health API unmarshal failed", distro.R().PD)
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
	data, err := pdClient.SendGetRequest("/config/replicate")
	if err != nil {
		return nil, err
	}

	var replicateConfig struct {
		LocationLabels string `json:"location-labels"`
	}
	err = json.Unmarshal(data, &replicateConfig)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "%s config/replicate API unmarshal failed", distro.R().PD)
	}
	labels := strings.Split(replicateConfig.LocationLabels, ",")
	return labels, nil
}
