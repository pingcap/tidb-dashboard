// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package hostinfo

import (
	"strings"

	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/util/netutil"
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
			"OR (`TYPE` = 'pd' AND `KEY` = 'data-dir') " +
			"OR (`TYPE` = 'tiflash' AND `KEY` = 'engine-store.path')").
		Find(&rows).Error; err != nil {
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
