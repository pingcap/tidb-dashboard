// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package hostinfo

import (
	"encoding/json"
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
			"OR (`TYPE` = 'ticdc' AND `KEY` = 'data-dir')" +
			"OR (`TYPE` = 'tiflash' AND (`KEY` = 'engine-store.path' " +
			"    OR `KEY` = 'engine-store.storage.main.dir' " +
			"    OR `KEY` = 'engine-store.storage.latest.dir'))").
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
		switch row.Type {
		case "tiflash":
			if ins, ok := m[hostname].Instances[row.Instance]; ok {
				if ins.Type == row.Type && ins.PartitionPathL != "" {
					continue
				}
			} else {
				m[hostname].Instances[row.Instance] = &InstanceInfo{
					Type:           row.Type,
					PartitionPathL: "",
				}
			}
			var paths []string
			switch row.Key {
			case "engine-store.path":
				items := strings.Split(row.Value, ",")
				for _, path := range items {
					paths = append(paths, strings.TrimSpace(path))
				}
			case "engine-store.storage.main.dir", "engine-store.storage.latest.dir":
				if err := json.Unmarshal([]byte(row.Value), &paths); err != nil {
					return err
				}
			default:
				paths = []string{row.Value}
			}
			for _, path := range paths {
				mountDir := locateInstanceMountPartition(path, m[hostname].Partitions)
				if mountDir != "" {
					m[hostname].Instances[row.Instance].PartitionPathL = strings.ToLower(mountDir)
					break
				}
			}
		default:
			m[hostname].Instances[row.Instance] = &InstanceInfo{
				Type:           row.Type,
				PartitionPathL: strings.ToLower(locateInstanceMountPartition(row.Value, m[hostname].Partitions)),
			}
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
