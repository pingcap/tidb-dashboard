package clusterinfo

import (
	"fmt"
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
	IP         string `json:"ip"`
	CPUCore    int    `json:"cpu_core"`
	CPUUsage   `json:"cpu_usage"`
	Memory     `json:"memory"`
	Partitions []PartitionInstance `json:"partitions"`
}

type Instance struct {
	Address    string `json:"address"`
	ServerType string `json:"server_type"`
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
	cores, err := loadCPUCores(db)
	if err != nil {
		return nil, err
	}
	usages, err := loadCPUUsage(db)
	if err != nil {
		return nil, err
	}
	memory, err := loadMemory(db)
	if err != nil {
		return nil, err
	}

	infos := make([]HostInfo, 0)
	for ip, instances := range hostMap {
		var disks = make([]PartitionInstance, 0)
		for _, instance := range instances {
			dataDir, err := queryDeployInfo(db, instance)
			if err != nil {
				continue
			}
			diskMap, err := queryPartition(db, instance)
			if err != nil {
				continue
			}
			disk := inferPartition(dataDir, diskMap)

			disks = append(disks, PartitionInstance{
				Partition: disk,
				Instance:  instance,
			})
		}

		info := HostInfo{
			IP:         ip,
			CPUCore:    cores[ip],
			CPUUsage:   usages[ip],
			Memory:     memory[ip],
			Partitions: disks,
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

type HostMap map[string][]Instance

func loadHosts(db *gorm.DB) (HostMap, error) {
	hostMap := make(HostMap)

	sql := "select TYPE, INSTANCE from INFORMATION_SCHEMA.CLUSTER_INFO;"
	rows, err := db.Raw(sql).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var instance, serverType string
		err = rows.Scan(&serverType, &instance)
		if err != nil {
			continue
		}
		ip := parseIP(instance)
		var list []Instance
		if instances, ok := hostMap[ip]; ok {
			list = instances
		}

		list = append(list, Instance{
			Address:    instance,
			ServerType: serverType,
		})
		hostMap[ip] = list
	}

	return hostMap, nil
}

type CPUCoreMap map[string]int

func loadCPUCores(db *gorm.DB) (CPUCoreMap, error) {
	var m = make(CPUCoreMap)

	sql := "select INSTANCE, VALUE from INFORMATION_SCHEMA.CLUSTER_HARDWARE where name = 'cpu-logical-cores';"
	rows, err := db.Raw(sql).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var instance string
		var value int
		err = rows.Scan(&instance, &value)
		if err != nil {
			continue
		}
		ip := parseIP(instance)
		m[ip] = value
	}

	return m, nil
}

func parseIP(addr string) string {
	return strings.Split(addr, ":")[0]
}

type MemoryMap map[string]Memory

func loadMemory(db *gorm.DB) (MemoryMap, error) {
	var m = make(MemoryMap)

	sql := "select INSTANCE, NAME, VALUE from INFORMATION_SCHEMA.CLUSTER_LOAD where device_type = 'memory' and device_name = 'virtual';"
	rows, err := db.Raw(sql).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var instance, name string
		var value int
		err = rows.Scan(&instance, &name, &value)
		if err != nil {
			continue
		}
		ip := parseIP(instance)

		var memory Memory
		var ok bool
		if memory, ok = m[ip]; !ok {
			memory = Memory{}
		}

		switch name {
		case "total":
			memory.Total = value
		case "used":
			memory.Used = value
		default:
			continue
		}
		m[ip] = memory
	}

	return m, nil
}

type CPUUsageMap map[string]CPUUsage

func loadCPUUsage(db *gorm.DB) (CPUUsageMap, error) {
	var m = make(CPUUsageMap)

	sql := "select INSTANCE, NAME, VALUE from INFORMATION_SCHEMA.CLUSTER_LOAD where device_type = 'cpu' and device_name = 'usage';"
	rows, err := db.Raw(sql).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var instance, name string
		var value float64
		err = rows.Scan(&instance, &name, &value)
		if err != nil {
			continue
		}
		ip := parseIP(instance)

		var cpu CPUUsage
		var ok bool
		if cpu, ok = m[ip]; !ok {
			cpu = CPUUsage{}
		}

		switch name {
		case "system":
			cpu.System = value
		case "idle":
			cpu.Idle = value
		default:
			continue
		}
		m[ip] = cpu
	}

	return m, nil
}

type PartitionMap map[string]Partition

func queryPartition(db *gorm.DB, instance Instance) (PartitionMap, error) {
	var m = make(PartitionMap)

	sql := fmt.Sprintf("select DEVICE_NAME, NAME, VALUE from INFORMATION_SCHEMA.CLUSTER_HARDWARE where type = '%s' and instance = '%s' and device_type = 'disk';",
		instance.ServerType,
		instance.Address,
	)
	rows, err := db.Raw(sql).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var deviceName, name string
		var value string
		err = rows.Scan(&deviceName, &name, &value)
		if err != nil {
			continue
		}

		var partition Partition
		var ok bool
		if partition, ok = m[deviceName]; !ok {
			partition = Partition{}
		}

		switch name {
		case "fstype":
			partition.FSType = value
		case "path":
			partition.Path = value
		case "total":
			partition.Total, err = strconv.Atoi(value)
			if err != nil {
				continue
			}
		case "free":
			partition.Free, err = strconv.Atoi(value)
			if err != nil {
				continue
			}
		default:
			continue
		}

		m[deviceName] = partition
	}

	return m, nil
}

func queryDeployInfo(db *gorm.DB, instance Instance) (string, error) {
	var configKey string
	switch instance.ServerType {
	case "tidb":
		configKey = "log.file.filename"
	case "tikv":
		configKey = "storage.data-dir"
	case "pd":
		configKey = "data-dir"
	default:
		return "", fmt.Errorf("unknown server type: %s", instance.ServerType)
	}
	sql := fmt.Sprintf("select VALUE from INFORMATION_SCHEMA.CLUSTER_CONFIG where type = '%s' and instance = '%s' and `key` = '%s';",
		instance.ServerType,
		instance.Address,
		configKey)

	var dataDir string
	if err := db.Raw(sql).Row().Scan(&dataDir); err != nil {
		return "", err
	}

	return dataDir, nil
}
