// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package clusterinfo

import (
	"net"
	"sort"
	"strconv"
	"strings"

	"github.com/samber/lo"
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
		NumberOfHosts:            len(lo.Keys(info.hosts)),
		NumberOfInstances:        len(lo.Keys(info.instances)),
		TotalMemoryCapacityBytes: sumInt(lo.Map(lo.Values(info.hosts), func(x *instanceKindHostImmediateInfo, _ int) int { return x.memoryCapacity })),
		TotalPhysicalCores:       sumInt(lo.Map(lo.Values(info.hosts), func(x *instanceKindHostImmediateInfo, _ int) int { return x.physicalCores })),
		TotalLogicalCores:        sumInt(lo.Map(lo.Values(info.hosts), func(x *instanceKindHostImmediateInfo, _ int) int { return x.logicalCores })),
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
	infoByIk["ticdc"] = newInstanceKindImmediateInfo()
	infoByIk["tiproxy"] = newInstanceKindImmediateInfo()
	infoByIk["tso"] = newInstanceKindImmediateInfo()
	infoByIk["scheduling"] = newInstanceKindImmediateInfo()

	// Fill from topology info
	pdInfo, err := topology.FetchPDTopology(s.params.PDClient)
	if err != nil {
		return nil, err
	}
	for _, i := range pdInfo {
		globalHostsSet[i.IP] = struct{}{}
		globalVersionsSet[i.Version] = struct{}{}
		globalInfo.instances[net.JoinHostPort(i.IP, strconv.Itoa(int(i.Port)))] = struct{}{}
		infoByIk["pd"].instances[net.JoinHostPort(i.IP, strconv.Itoa(int(i.Port)))] = struct{}{}
	}
	tikvInfo, tiFlashInfo, err := topology.FetchStoreTopology(s.params.PDClient)
	if err != nil {
		return nil, err
	}
	for _, i := range tikvInfo {
		globalHostsSet[i.IP] = struct{}{}
		globalVersionsSet[i.Version] = struct{}{}
		globalInfo.instances[net.JoinHostPort(i.IP, strconv.Itoa(int(i.Port)))] = struct{}{}
		infoByIk["tikv"].instances[net.JoinHostPort(i.IP, strconv.Itoa(int(i.Port)))] = struct{}{}
	}
	for _, i := range tiFlashInfo {
		globalHostsSet[i.IP] = struct{}{}
		globalVersionsSet[i.Version] = struct{}{}
		globalInfo.instances[net.JoinHostPort(i.IP, strconv.Itoa(int(i.Port)))] = struct{}{}
		infoByIk["tiflash"].instances[net.JoinHostPort(i.IP, strconv.Itoa(int(i.Port)))] = struct{}{}
	}
	tidbInfo, err := topology.FetchTiDBTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err != nil {
		return nil, err
	}
	for _, i := range tidbInfo {
		globalHostsSet[i.IP] = struct{}{}
		globalVersionsSet[i.Version] = struct{}{}
		globalInfo.instances[net.JoinHostPort(i.IP, strconv.Itoa(int(i.Port)))] = struct{}{}
		infoByIk["tidb"].instances[net.JoinHostPort(i.IP, strconv.Itoa(int(i.Port)))] = struct{}{}
	}
	ticdcInfo, err := topology.FetchTiCDCTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err != nil {
		return nil, err
	}
	for _, i := range ticdcInfo {
		globalHostsSet[i.IP] = struct{}{}
		globalVersionsSet[i.Version] = struct{}{}
		globalInfo.instances[net.JoinHostPort(i.IP, strconv.Itoa(int(i.Port)))] = struct{}{}
		infoByIk["ticdc"].instances[net.JoinHostPort(i.IP, strconv.Itoa(int(i.Port)))] = struct{}{}
	}
	tiproxyInfo, err := topology.FetchTiProxyTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err != nil {
		return nil, err
	}
	for _, i := range tiproxyInfo {
		globalHostsSet[i.IP] = struct{}{}
		globalVersionsSet[i.Version] = struct{}{}
		globalInfo.instances[net.JoinHostPort(i.IP, strconv.Itoa(int(i.Port)))] = struct{}{}
		infoByIk["tiproxy"].instances[net.JoinHostPort(i.IP, strconv.Itoa(int(i.Port)))] = struct{}{}
	}
	tsoInfo, err := topology.FetchTSOTopology(s.lifecycleCtx, s.params.PDClient)
	if err != nil {
		if strings.Contains(err.Error(), "status code 404") {
			tsoInfo = []topology.TSOInfo{}
		} else {
			return nil, err
		}
	}
	for _, i := range tsoInfo {
		globalHostsSet[i.IP] = struct{}{}
		globalVersionsSet[i.Version] = struct{}{}
		globalInfo.instances[net.JoinHostPort(i.IP, strconv.Itoa(int(i.Port)))] = struct{}{}
		infoByIk["tso"].instances[net.JoinHostPort(i.IP, strconv.Itoa(int(i.Port)))] = struct{}{}
	}
	schedulingInfo, err := topology.FetchSchedulingTopology(s.lifecycleCtx, s.params.PDClient)
	if err != nil {
		if strings.Contains(err.Error(), "status code 404") {
			schedulingInfo = []topology.SchedulingInfo{}
		} else {
			return nil, err
		}
	}
	for _, i := range schedulingInfo {
		globalHostsSet[i.IP] = struct{}{}
		globalVersionsSet[i.Version] = struct{}{}
		globalInfo.instances[net.JoinHostPort(i.IP, strconv.Itoa(int(i.Port)))] = struct{}{}
		infoByIk["scheduling"].instances[net.JoinHostPort(i.IP, strconv.Itoa(int(i.Port)))] = struct{}{}
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
	for _, i := range ticdcInfo {
		if v, ok := globalInfo.hosts[i.IP]; ok {
			infoByIk["ticdc"].hosts[i.IP] = v
		} else {
			globalFailureHostsSet[i.IP] = struct{}{}
		}
	}
	for _, i := range tiproxyInfo {
		if v, ok := globalInfo.hosts[i.IP]; ok {
			infoByIk["tiproxy"].hosts[i.IP] = v
		} else {
			globalFailureHostsSet[i.IP] = struct{}{}
		}
	}
	for _, i := range tsoInfo {
		if v, ok := globalInfo.hosts[i.IP]; ok {
			infoByIk["tso"].hosts[i.IP] = v
		} else {
			globalFailureHostsSet[i.IP] = struct{}{}
		}
	}
	for _, i := range schedulingInfo {
		if v, ok := globalInfo.hosts[i.IP]; ok {
			infoByIk["scheduling"].hosts[i.IP] = v
		} else {
			globalFailureHostsSet[i.IP] = struct{}{}
		}
	}

	// Generate result..
	versions := lo.Keys(globalVersionsSet)
	sort.Strings(versions)

	statsByIk := make(map[string]*ClusterStatisticsPartial)
	for ik, info := range infoByIk {
		statsByIk[ik] = info.ToResult()
	}

	return &ClusterStatistics{
		ProbeFailureHosts:   len(lo.Keys(globalFailureHostsSet)),
		Versions:            versions,
		TotalStats:          globalInfo.ToResult(),
		StatsByInstanceKind: statsByIk,
	}, nil
}
