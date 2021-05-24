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

package hostinfo

import (
	"bytes"
	"encoding/json"

	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/utils/host"
)

// Used to deserialize from JSON_VALUE
type clusterLoadCPUUsageModel struct {
	Idle   float64 `json:"idle,string"`
	System float64 `json:"system,string"`
}

// Used to deserialize from JSON_VALUE
type clusterLoadMemoryVirtualModel struct {
	Used  int `json:"used,string"`
	Total int `json:"total,string"`
}

func FillFromClusterLoadTable(db *gorm.DB, m InfoMap) error {
	var rows []clusterTableModel

	var sqlQuery bytes.Buffer
	if err := clusterTableQueryTemplate.Execute(&sqlQuery, map[string]string{
		"tableName": "INFORMATION_SCHEMA.CLUSTER_LOAD",
	}); err != nil {
		panic(err)
	}

	if err := db.
		Raw(sqlQuery.String(), []string{"memory", "cpu"}).
		Scan(&rows).Error; err != nil {
		return err
	}

	for _, row := range rows {
		hostname, _, err := host.ParseHostAndPortFromAddress(row.Instance)
		if err != nil {
			continue
		}
		if _, ok := m[hostname]; !ok {
			m[hostname] = NewHostInfo(hostname)
		}

		switch {
		case row.DeviceType == "memory" && row.DeviceName == "virtual":
			if m[hostname].MemoryUsage != nil {
				continue
			}
			var v clusterLoadMemoryVirtualModel
			err := json.Unmarshal([]byte(row.JSONValue), &v)
			if err != nil {
				continue
			}
			m[hostname].MemoryUsage = &MemoryUsageInfo{
				Used:  v.Used,
				Total: v.Total,
			}
		case row.DeviceType == "cpu" && row.DeviceName == "usage":
			if m[hostname].CPUUsage != nil {
				continue
			}
			var v clusterLoadCPUUsageModel
			err := json.Unmarshal([]byte(row.JSONValue), &v)
			if err != nil {
				continue
			}
			m[hostname].CPUUsage = &CPUUsageInfo{
				Idle:   v.Idle,
				System: v.System,
			}
		}
	}
	return nil
}
