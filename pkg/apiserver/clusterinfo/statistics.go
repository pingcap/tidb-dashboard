// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package clusterinfo

import (
	"fmt"
	"sort"

	"github.com/thoas/go-funk"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/clusterinfo/hostinfo"
	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
)

type ClusterStatisticsPartial struct {
	NumberOfHosts            int `json:"number_of_hosts"`
	NumberOfInstances        int `json:"number_of_instances"`
	TotalMemoryCapacityBytes int `json:"total_memory_capacity_bytes"`
	TotalPhysicalCores       int `json:"total_physical_cores"`
	TotalLogicalCores        int `json:"total_logical_cores"`
}

type ClusterStatistics struct {
	ProbeFailureHosts   int                                  `json:"probe_failure_hosts"`
	Versions            []string                             `json:"versions"`
	TotalStats          *ClusterStatisticsPartial            `json:"total_stats"`
	StatsByInstanceKind map[string]*ClusterStatisticsPartial `json:"stats_by_instance_kind"`
}

type instanceKindHostImmediateInfo struct {
	memoryCapacity int
	physicalCores  int
	logicalCores   int
}

type instanceKindImmediateInfo struct {
	instances map[string]struct{}
	hosts     map[string]*instanceKindHostImmediateInfo
}

func newInstanceKindImmediateInfo() *instanceKindImmediateInfo {
	return &instanceKindImmediateInfo{
		instances: make(map[string]struct{}),
		hosts:     make(map[string]*instanceKindHostImmediateInfo),
	}
}

func sumInt(array []int) int {
	result := 0
	for _, v := range array {
		result += v
	}
	return result
}

func (info *instanceKindImmediateInfo) ToResult() *ClusterStatisticsPartial {
	return &ClusterStatisticsPartial{
		NumberOfHosts:            len(funk.Keys(info.hosts).([]string)),
		NumberOfInstances:        len(funk.Keys(info.instances).([]string)),
		TotalMemoryCapacityBytes: sumInt(funk.Map(funk.Values(info.hosts), func(x *instanceKindHostImmediateInfo) int { return x.memoryCapacity }).([]int)),
		TotalPhysicalCores:       sumInt(funk.Map(funk.Values(info.hosts), func(x *instanceKindHostImmediateInfo) int { return x.physicalCores }).([]int)),
		TotalLogicalCores:        sumInt(funk.Map(funk.Values(info.hosts), func(x *instanceKindHostImmediateInfo) int { return x.logicalCores }).([]int)),
	}
}

func (s *Service) calculateStatistics(db *gorm.DB) (*ClusterStatistics, error) {
	globalHostsSet := make(map[string]struct{})
	globalFailureHostsSet := make(map[string]struct{})
	globalVersionsSet := make(map[string]struct{})
	globalInfo := newInstanceKindImmediateInfo()
	infoByIk := make(map[string]*instanceKindImmediateInfo)
	infoByIk["pd"] = newInstanceKindImmediateInfo()
	infoByIk["tidb"] = newInstanceKindImmediateInfo()
	infoByIk["tikv"] = newInstanceKindImmediateInfo()
	infoByIk["tiflash"] = newInstanceKindImmediateInfo()

	// Fill from topology info
	pdInfo, err := topology.FetchPDTopology(s.params.PDClient)
	if err != nil {
		return nil, err
	}
	for _, i := range pdInfo {
		globalHostsSet[i.IP] = struct{}{}
		globalVersionsSet[i.Version] = struct{}{}
		globalInfo.instances[fmt.Sprintf("%s:%d", i.IP, i.Port)] = struct{}{}
		infoByIk["pd"].instances[fmt.Sprintf("%s:%d", i.IP, i.Port)] = struct{}{}
	}
	tikvInfo, tiFlashInfo, err := topology.FetchStoreTopology(s.params.PDClient)
	if err != nil {
		return nil, err
	}
	for _, i := range tikvInfo {
		globalHostsSet[i.IP] = struct{}{}
		globalVersionsSet[i.Version] = struct{}{}
		globalInfo.instances[fmt.Sprintf("%s:%d", i.IP, i.Port)] = struct{}{}
		infoByIk["tikv"].instances[fmt.Sprintf("%s:%d", i.IP, i.Port)] = struct{}{}
	}
	for _, i := range tiFlashInfo {
		globalHostsSet[i.IP] = struct{}{}
		globalVersionsSet[i.Version] = struct{}{}
		globalInfo.instances[fmt.Sprintf("%s:%d", i.IP, i.Port)] = struct{}{}
		infoByIk["tiflash"].instances[fmt.Sprintf("%s:%d", i.IP, i.Port)] = struct{}{}
	}
	tidbInfo, err := topology.FetchTiDBTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err != nil {
		return nil, err
	}
	for _, i := range tidbInfo {
		globalHostsSet[i.IP] = struct{}{}
		globalVersionsSet[i.Version] = struct{}{}
		globalInfo.instances[fmt.Sprintf("%s:%d", i.IP, i.Port)] = struct{}{}
		infoByIk["tidb"].instances[fmt.Sprintf("%s:%d", i.IP, i.Port)] = struct{}{}
	}

	// Fill from hardware info
	allHostsInfoMap := make(map[string]*hostinfo.Info)
	if e := hostinfo.FillFromClusterLoadTable(db, allHostsInfoMap); e != nil {
		return nil, err
	}
	if e := hostinfo.FillFromClusterHardwareTable(db, allHostsInfoMap); e != nil {
		return nil, err
	}
	for host, hi := range allHostsInfoMap {
		if hi.MemoryUsage.Total > 0 && hi.CPUInfo.PhysicalCores > 0 && hi.CPUInfo.LogicalCores > 0 {
			// Put success host info into `globalInfo.hosts`.
			globalInfo.hosts[host] = &instanceKindHostImmediateInfo{
				memoryCapacity: hi.MemoryUsage.Total,
				physicalCores:  hi.CPUInfo.PhysicalCores,
				logicalCores:   hi.CPUInfo.LogicalCores,
			}
		}
	}

	// Fill hosts in each instance kind according to the global hosts info
	for _, i := range pdInfo {
		if v, ok := globalInfo.hosts[i.IP]; ok {
			infoByIk["pd"].hosts[i.IP] = v
		} else {
			globalFailureHostsSet[i.IP] = struct{}{}
		}
	}
	for _, i := range tikvInfo {
		if v, ok := globalInfo.hosts[i.IP]; ok {
			infoByIk["tikv"].hosts[i.IP] = v
		} else {
			globalFailureHostsSet[i.IP] = struct{}{}
		}
	}
	for _, i := range tiFlashInfo {
		if v, ok := globalInfo.hosts[i.IP]; ok {
			infoByIk["tiflash"].hosts[i.IP] = v
		} else {
			globalFailureHostsSet[i.IP] = struct{}{}
		}
	}
	for _, i := range tidbInfo {
		if v, ok := globalInfo.hosts[i.IP]; ok {
			infoByIk["tidb"].hosts[i.IP] = v
		} else {
			globalFailureHostsSet[i.IP] = struct{}{}
		}
	}

	// Generate result..
	versions := funk.Keys(globalVersionsSet).([]string)
	sort.Strings(versions)

	statsByIk := make(map[string]*ClusterStatisticsPartial)
	for ik, info := range infoByIk {
		statsByIk[ik] = info.ToResult()
	}

	return &ClusterStatistics{
		ProbeFailureHosts:   len(funk.Keys(globalFailureHostsSet).([]string)),
		Versions:            versions,
		TotalStats:          globalInfo.ToResult(),
		StatsByInstanceKind: statsByIk,
	}, nil
}
