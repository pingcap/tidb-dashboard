// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package clusterinfo

import (
	"sort"
	"strings"

	"github.com/pingcap/log"
	"github.com/samber/lo"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/clusterinfo/hostinfo"
	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
)

// fetchAllInstanceHosts fetches all hosts in the cluster and return in ascending order.
func (s *Service) fetchAllInstanceHosts() ([]string, error) {
	allHostsMap := make(map[string]struct{})
	pdInfo, err := topology.FetchPDTopology(s.params.PDClient)
	if err != nil {
		return nil, err
	}
	for _, i := range pdInfo {
		allHostsMap[i.IP] = struct{}{}
	}

	tikvInfo, tiFlashInfo, err := topology.FetchStoreTopology(s.params.PDClient)
	if err != nil {
		return nil, err
	}
	for _, i := range tikvInfo {
		allHostsMap[i.IP] = struct{}{}
	}
	for _, i := range tiFlashInfo {
		allHostsMap[i.IP] = struct{}{}
	}

	tidbInfo, err := topology.FetchTiDBTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err != nil {
		return nil, err
	}
	for _, i := range tidbInfo {
		allHostsMap[i.IP] = struct{}{}
	}

	ticdcInfo, err := topology.FetchTiCDCTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err != nil {
		return nil, err
	}
	for _, i := range ticdcInfo {
		allHostsMap[i.IP] = struct{}{}
	}

	tiproxyInfo, err := topology.FetchTiProxyTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err != nil {
		return nil, err
	}
	for _, i := range tiproxyInfo {
		allHostsMap[i.IP] = struct{}{}
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
		allHostsMap[i.IP] = struct{}{}
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
		allHostsMap[i.IP] = struct{}{}
	}

	allHosts := lo.Keys(allHostsMap)
	sort.Strings(allHosts)

	return allHosts, nil
}

// fetchAllHostsInfo fetches all hosts and their information.
// Note: The returned data and error may both exist.
func (s *Service) fetchAllHostsInfo(db *gorm.DB) ([]*hostinfo.Info, error) {
	allHosts, err := s.fetchAllInstanceHosts()
	if err != nil {
		return nil, err
	}

	allHostsInfoMap := make(map[string]*hostinfo.Info)
	if e := hostinfo.FillFromClusterLoadTable(db, allHostsInfoMap); e != nil {
		log.Warn("Failed to read cluster_load table", zap.Error(e))
		err = e
	}
	if e := hostinfo.FillFromClusterHardwareTable(db, allHostsInfoMap); e != nil && err == nil {
		log.Warn("Failed to read cluster_hardware table", zap.Error(e))
		err = e
	}
	if e := hostinfo.FillInstances(db, allHostsInfoMap); e != nil && err == nil {
		log.Warn("Failed to fill instances for hosts", zap.Error(e))
		err = e
	}

	r := make([]*hostinfo.Info, 0, len(allHosts))
	for _, host := range allHosts {
		if im, ok := allHostsInfoMap[host]; ok {
			r = append(r, im)
		} else {
			// Missing item
			r = append(r, hostinfo.NewHostInfo(host))
		}
	}
	return r, err
}
