// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package hostinfo

import (
	"bytes"
	"encoding/json"
	"strings"

	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/util/netutil"
)

// Used to deserialize from JSON_VALUE.
type clusterHardwareCPUInfoModel struct {
	Arch          string `json:"cpu-arch"`
	LogicalCores  int    `json:"cpu-logical-cores,string"`
	PhysicalCores int    `json:"cpu-physical-cores,string"`
}

// Used to deserialize from JSON_VALUE.
type clusterHardwareDiskModel struct {
	Path   string `json:"path"`
	FSType string `json:"fstype"`
	Free   int    `json:"free,string"`
	Total  int    `json:"total,string"`
}

func FillFromClusterHardwareTable(db *gorm.DB, m InfoMap) error {
	var rows []clusterTableModel

	var sqlQuery bytes.Buffer
	if err := clusterTableQueryTemplate.Execute(&sqlQuery, map[string]string{
		"tableName": "INFORMATION_SCHEMA.CLUSTER_HARDWARE",
	}); err != nil {
		panic(err)
	}

	if err := db.
		Raw(sqlQuery.String(), []string{"cpu", "disk"}).
		Scan(&rows).Error; err != nil {
		return err
	}

	for _, row := range rows {
		hostname, _, err := netutil.ParseHostAndPortFromAddress(row.Instance)
		if err != nil {
			continue
		}
		if _, ok := m[hostname]; !ok {
			m[hostname] = NewHostInfo(hostname)
		}

		switch {
		case row.DeviceType == "cpu" && row.DeviceName == "cpu":
			if m[hostname].CPUInfo != nil {
				continue
			}
			var v clusterHardwareCPUInfoModel
			err := json.Unmarshal([]byte(row.JSONValue), &v)
			if err != nil {
				continue
			}
			m[hostname].CPUInfo = &CPUInfo{
				Arch:          v.Arch,
				LogicalCores:  v.LogicalCores,
				PhysicalCores: v.PhysicalCores,
			}
		case row.DeviceType == "disk":
			if m[hostname].PartitionProviderType != "" && m[hostname].PartitionProviderType != row.Type {
				// Another instance on the same host has already provided disk information, skip.
				continue
			}
			var v clusterHardwareDiskModel
			err := json.Unmarshal([]byte(row.JSONValue), &v)
			if err != nil {
				continue
			}
			if m[hostname].PartitionProviderType == "" {
				m[hostname].PartitionProviderType = row.Type
			}
			m[hostname].Partitions[strings.ToLower(v.Path)] = &PartitionInfo{
				Path:   v.Path,
				FSType: v.FSType,
				Free:   v.Free,
				Total:  v.Total,
			}
		}
	}

	return nil
}
