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

import "text/template"

type CPUUsageInfo struct {
	Idle   float64 `json:"idle"`
	System float64 `json:"system"`
}

type MemoryUsageInfo struct {
	Used  int `json:"used"`
	Total int `json:"total"`
}

type CPUInfo struct {
	LogicalCores  int `json:"logical_cores"`
	PhysicalCores int `json:"physical_cores"`
	// TODO: Support arch.
}

type PartitionInfo struct {
	Path   string `json:"path"`
	FSType string `json:"fstype"`
	Free   int    `json:"free"`
	Total  int    `json:"total"`
}

type InstanceInfo struct {
	Type           string `json:"type"`
	PartitionPathL string `json:"partition_path_lower"`
}

type HostInfo struct {
	Host        string           `json:"host"`
	CPUInfo     *CPUInfo         `json:"cpu_info"`
	CPUUsage    *CPUUsageInfo    `json:"cpu_usage"`
	MemoryUsage *MemoryUsageInfo `json:"memory_usage"`

	// Containing unused partitions. The key is path in lower case.
	// Note: deviceName is not used as the key, since TiDB and TiKV may return different deviceName for the same device.
	Partitions map[string]*PartitionInfo `json:"partitions"`
	// The source instance type that provides the partition info.
	PartitionProviderType string `json:"-"`

	// Instances in the current host. The key is instance address
	Instances map[string]*InstanceInfo `json:"instances"`
}

type HostInfoMap = map[string]*HostInfo

var clusterTableQueryTemplate = template.Must(template.New("").Parse(`
SELECT
	*, 
	FIELD(LOWER(A.TYPE), 'tiflash', 'tikv', 'pd', 'tidb') AS _ORDER 
FROM (
	SELECT
		TYPE, INSTANCE, DEVICE_TYPE, DEVICE_NAME, JSON_OBJECTAGG(NAME, VALUE) AS JSON_VALUE
	FROM
		{{.tableName}}
	WHERE
		DEVICE_TYPE IN (?)
	GROUP BY TYPE, INSTANCE, DEVICE_TYPE, DEVICE_NAME
) AS A
ORDER BY
	_ORDER DESC, INSTANCE, DEVICE_TYPE, DEVICE_NAME
`))

type clusterTableModel struct {
	Type       string `gorm:"column:TYPE"`        // Example: tidb, tikv
	Instance   string `gorm:"column:INSTANCE"`    // Example: 127.0.0.1:4000
	DeviceType string `gorm:"column:DEVICE_TYPE"` // Example: cpu
	DeviceName string `gorm:"column:DEVICE_NAME"` // Example: usage
	JsonValue  string `gorm:"column:JSON_VALUE"`  // Only exists by using `clusterTableQueryTemplate`.
}

func NewHostInfo(hostname string) *HostInfo {
	return &HostInfo{
		Host:       hostname,
		Partitions: make(map[string]*PartitionInfo),
		Instances:  make(map[string]*InstanceInfo),
	}
}
