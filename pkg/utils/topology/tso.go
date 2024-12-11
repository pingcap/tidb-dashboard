// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package topology

import (
	"context"
	"encoding/json"
	"sort"

	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/util/distro"
	"github.com/pingcap/tidb-dashboard/util/netutil"
)

func FetchTSOTopology(_ context.Context, pdClient *pd.Client) ([]TSOInfo, error) {
	nodes := make([]TSOInfo, 0)
	data, err := pdClient.WithoutPrefix().SendGetRequest("/pd/api/v2/ms/members/tso")
	if err != nil {
		return nil, err
	}

	ds := []struct {
		ServiceAddr    string `json:"service-addr"`
		Version        string `json:"version"`
		GitHash        string `json:"git-hash"`
		DeployPath     string `json:"deploy-path"`
		StartTimestamp int64  `json:"start-timestamp"`
	}{}

	err = json.Unmarshal(data, &ds)
	if err != nil {
		return nil, ErrInvalidTopologyData.Wrap(err, "%s members API unmarshal failed", distro.R().TSO)
	}

	for _, ds := range ds {
		u := ds.ServiceAddr
		hostname, port, err := netutil.ParseHostAndPortFromAddressURL(u)
		if err != nil {
			continue
		}

		nodes = append(nodes, TSOInfo{
			GitHash:        ds.GitHash,
			Version:        ds.Version,
			IP:             hostname,
			Port:           port,
			DeployPath:     ds.DeployPath,
			Status:         ComponentStatusUp,
			StartTimestamp: ds.StartTimestamp,
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
