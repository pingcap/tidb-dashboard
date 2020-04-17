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
	"math"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/jinzhu/gorm"
)

type CPUUsage struct {
	Idle   float64 `json:"idle"`
	System float64 `json:"system"`
}

type Memory struct {
	Used  int `json:"used"`
	Total int `json:"total"`
}

type Partition struct {
	Path   string `json:"path"`
	FSType string `json:"fstype"`
	Free   int    `json:"free"`
	Total  int    `json:"total"`
}

type HostInfo struct {
	IP          string `json:"ip"`
	CPUCore     int    `json:"cpu_core,omitempty"`
	*CPUUsage   `json:"cpu_usage,omitempty"`
	*Memory     `json:"memory,omitempty"`
	Partitions  []PartitionInstance `json:"partitions,omitempty"`
	Unavailable bool                `json:"unavailable"`
}

type Instance struct {
	Address    string `gorm:"column:INSTANCE" json:"address"`
	ServerType string `gorm:"column:TYPE" json:"server_type"`
}

type PartitionInstance struct {
	Partition `json:"partition"`
	Instance  `json:"instance"`
}

func GetAllHostInfo(db *gorm.DB) ([]HostInfo, error) {
	hostMap, err := loadHosts(db)
	if err != nil {
		return nil, err
	}
	memory, usages, err := queryClusterLoad(db)
	if err != nil {
		return nil, err
	}
	cores, hostPartitionMap, err := queryClusterHardware(db)
	if err != nil {
		return nil, err
	}
	dataDirMap, err := queryDeployInfo(db)
	if err != nil {
		return nil, err
	}

	infos := make([]HostInfo, 0)
	for ip, instances := range hostMap {
		var partitions = make([]PartitionInstance, 0)
		for _, instance := range instances {
			ip := parseIP(instance.Address)

			partitionMap, ok := hostPartitionMap[ip]
			if !ok {
				continue
			}

			dataDir, ok := dataDirMap[instance.Address]
			if !ok {
				continue
			}

			partition := inferPartition(dataDir, partitionMap)

			partitions = append(partitions, PartitionInstance{
				Partition: partition,
				Instance:  instance,
			})
		}

		info := HostInfo{
			IP:         ip,
			CPUCore:    cores[ip],
			CPUUsage:   usages[ip],
			Memory:     memory[ip],
			Partitions: partitions,
		}
		infos = append(infos, info)
	}

	return infos, nil
}

func splitPath(path string) []string {
	if path == "" {
		return []string{}
	}
	return strings.Split(path, string(filepath.Separator))
}

func inferPartition(dataDir string, diskMap PartitionMap) Partition {
	var targetDisk Partition
	var minRelativePathLength = math.MaxInt64

	for _, disk := range diskMap {
		rel, err := filepath.Rel(disk.Path, dataDir)
		if err != nil {
			continue
		}
		var relativePathLength int
		for _, dir := range splitPath(rel) {
			if dir == ".." {
				relativePathLength = -1
				break
			} else {
				relativePathLength++
			}
		}
		if relativePathLength == -1 {
			continue
		}
		if relativePathLength < minRelativePathLength {
			minRelativePathLength = relativePathLength
			targetDisk = disk
		}
	}

	return targetDisk
}

// HostMap map host ip to all instance on it
// e.g. "127.0.0.1" => []Instance{...}
type HostMap map[string][]Instance

func loadHosts(db *gorm.DB) (HostMap, error) {
	hostMap := make(HostMap)
	var rows []Instance
	if err := db.Table("INFORMATION_SCHEMA.CLUSTER_INFO").Find(&rows).Error; err != nil {
		return nil, err
	}
	for _, row := range rows {
		ip := parseIP(row.Address)
		instances, ok := hostMap[ip]
		if !ok {
			instances = []Instance{}
		}

		instances = append(instances, Instance{
			Address:    row.Address,
			ServerType: row.ServerType,
		})
		hostMap[ip] = instances
	}

	return hostMap, nil
}

func parseIP(addr string) string {
	return strings.Split(addr, ":")[0]
}

// CPUCoreMap map host ip to its cpu logical cores number
// e.g. "127.0.0.1" => 8
type CPUCoreMap map[string]int

// Memory map host ip to its Memory detail
// e.g. "127.0.0.1" => &Memory{}
type MemoryMap map[string]*Memory

// CPUUsageMap map host ip to its cpu usage
// e.g. "127.0.0.1" => &CPUUsage{ Idle: 0.1, System: 0.1 }
type CPUUsageMap map[string]*CPUUsage

type ClusterTableModel struct {
	Instance   string `gorm:"column:INSTANCE"`
	DeviceName string `gorm:"column:DEVICE_NAME"`
	DeviceType string `gorm:"column:DEVICE_TYPE"`
	Name       string `gorm:"column:NAME"`
	Value      string `gorm:"column:VALUE"`
}

const ClusterLoadCondition = "(device_type = 'memory' and device_name = 'virtual') or (device_type = 'cpu' and device_name = 'usage')"

func queryClusterLoad(db *gorm.DB) (MemoryMap, CPUUsageMap, error) {
	memoryMap := make(MemoryMap)
	cpuMap := make(CPUUsageMap)
	var rows []ClusterTableModel
	if err := db.Table("INFORMATION_SCHEMA.CLUSTER_LOAD").
		Where(ClusterLoadCondition).Find(&rows).Error; err != nil {
		return nil, nil, err
	}

	for _, row := range rows {
		switch {
		case row.DeviceType == "memory" && row.DeviceName == "virtual":
			saveMemory(row, &memoryMap)
		case row.DeviceType == "cpu" && row.DeviceName == "usage":
			saveCPUUsageMap(row, &cpuMap)
		default:
			continue
		}
	}
	return memoryMap, cpuMap, nil
}

func saveMemory(row ClusterTableModel, m *MemoryMap) {
	ip := parseIP(row.Instance)

	memory, ok := (*m)[ip]
	if !ok {
		memory = &Memory{}
		(*m)[ip] = memory
	}

	var err error
	switch row.Name {
	case "total":
		memory.Total, err = strconv.Atoi(row.Value)
		if err != nil {
			return
		}
	case "used":
		memory.Used, err = strconv.Atoi(row.Value)
		if err != nil {
			return
		}
	default:
		return
	}
}

func saveCPUUsageMap(row ClusterTableModel, m *CPUUsageMap) {
	ip := parseIP(row.Instance)

	var cpu *CPUUsage
	var ok bool
	if cpu, ok = (*m)[ip]; !ok {
		cpu = &CPUUsage{}
		(*m)[ip] = cpu
	}

	var err error
	switch row.Name {
	case "system":
		cpu.System, err = strconv.ParseFloat(row.Value, 64)
		if err != nil {
			return
		}
	case "idle":
		cpu.Idle, err = strconv.ParseFloat(row.Value, 64)
		if err != nil {
			return
		}
	default:
		return
	}
}

// PartitionMap map partition name to its detail
// e.g. "nvme0n1p1" => Partition{ Path: "/", FSType: "ext4", ... }
type PartitionMap map[string]Partition

// HostPartition map host ip to all partitions on it
// e.g. "127.0.0.1" => { "nvme0n1p1" => Partition{ Path: "/", FSType: "ext4", ... }, ... }
type HostPartitionMap map[string]PartitionMap

const ClusterHardWareCondition = "(device_type = 'cpu' and name = 'cpu-logical-cores') or (device_type = 'disk')"

func queryClusterHardware(db *gorm.DB) (CPUCoreMap, HostPartitionMap, error) {
	cpuMap := make(CPUCoreMap)
	hostMap := make(HostPartitionMap)
	var rows []ClusterTableModel

	if err := db.Table("INFORMATION_SCHEMA.CLUSTER_HARDWARE").Where(ClusterHardWareCondition).Find(&rows).Error; err != nil {
		return nil, nil, err
	}

	for _, row := range rows {
		switch {
		case row.DeviceType == "cpu" && row.Name == "cpu-logical-cores":
			saveCPUCore(row, &cpuMap)
		case row.DeviceType == "disk":
			savePartition(row, &hostMap)
		default:
			continue
		}
	}
	return cpuMap, hostMap, nil
}

func saveCPUCore(row ClusterTableModel, m *CPUCoreMap) {
	ip := parseIP(row.Instance)
	cores, err := strconv.Atoi(row.Value)
	if err != nil {
		return
	}
	(*m)[ip] = cores
}

func savePartition(row ClusterTableModel, m *HostPartitionMap) {
	ip := parseIP(row.Instance)

	partitionMap, ok := (*m)[ip]
	if !ok {
		partitionMap = make(PartitionMap)
	}

	partition, ok := partitionMap[row.DeviceName]
	if !ok {
		partition = Partition{}
	}

	var err error
	switch row.Name {
	case "fstype":
		partition.FSType = row.Value
	case "path":
		partition.Path = row.Value
	case "total":
		partition.Total, err = strconv.Atoi(row.Value)
		if err != nil {
			return
		}
	case "free":
		partition.Free, err = strconv.Atoi(row.Value)
		if err != nil {
			return
		}
	default:
		return
	}

	partitionMap[row.DeviceName] = partition
	(*m)[ip] = partitionMap
}

type ClusterConfigModel struct {
	Instance string `gorm:"column:INSTANCE"`
	Value    string `gorm:"column:VALUE"`
}

// DataDirMap map instance address to its data directory
// e.g. "127.0.0.1:20160" => "/tikv/data-dir"
type DataDirMap map[string]string

const ClusterConfigCondition = "(`type` = 'tidb' and `key` = 'log.file.filename') or (`type` = 'tikv' and `key` = 'storage.data-dir') or (`type` = 'pd' and `key` = 'data-dir')"

func queryDeployInfo(db *gorm.DB) (DataDirMap, error) {
	m := make(DataDirMap)
	var rows []ClusterConfigModel
	if err := db.Table("INFORMATION_SCHEMA.CLUSTER_CONFIG").Where(ClusterConfigCondition).Find(&rows).Error; err != nil {
		return nil, err
	}

	for _, row := range rows {
		m[row.Instance] = row.Value
	}
	return m, nil
}
