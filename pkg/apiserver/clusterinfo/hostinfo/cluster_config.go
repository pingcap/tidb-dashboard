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
	"strings"

	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/utils/host"
)

type clusterConfigModel struct {
	Type     string `gorm:"column:TYPE"`
	Instance string `gorm:"column:INSTANCE"`
	Key      string `gorm:"column:KEY"`
	Value    string `gorm:"column:VALUE"`
}

func FillInstances(db *gorm.DB, m InfoMap) error {
	var rows []clusterConfigModel
	if err := db.
		Table("INFORMATION_SCHEMA.CLUSTER_CONFIG").
		Where("(`TYPE` = 'tidb' AND `KEY` = 'log.file.filename') " +
			"OR (`TYPE` = 'tikv' AND `KEY` = 'storage.data-dir') " +
			"OR (`TYPE` = 'pd' AND `KEY` = 'data-dir')").
		Find(&rows).Error; err != nil {
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
		m[hostname].Instances[row.Instance] = &InstanceInfo{
			Type:           row.Type,
			PartitionPathL: strings.ToLower(locateInstanceMountPartition(row.Value, m[hostname].Partitions)),
		}
	}
	return nil
}

// Try to discover which partition this instance is running on.
// If discover failed, empty string will be returned.
func locateInstanceMountPartition(directoryOrFilePath string, partitions map[string]*PartitionInfo) string {
	if len(directoryOrFilePath) == 0 {
		return ""
	}

	maxMatchLen := 0
	maxMatchPath := ""

	directoryOrFilePathL := strings.ToLower(directoryOrFilePath)

	for _, info := range partitions {
		// FIXME: This may cause wrong result in case sensitive FS.
		if !strings.HasPrefix(directoryOrFilePathL, strings.ToLower(info.Path)) {
			continue
		}
		if len(info.Path) > maxMatchLen {
			maxMatchLen = len(info.Path)
			maxMatchPath = info.Path
		}
	}

	return maxMatchPath
}
