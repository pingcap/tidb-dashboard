package clusterinfo

import (
	"fmt"
	"github.com/jinzhu/gorm"
	"math"
	"path/filepath"
	"strconv"
	"strings"
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
	Partition       `json:"partition"`
	Instance        `json:"instance"`
	InstanceDataDir string `json:"instance_data_dir"`
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
				Partition:       disk,
				Instance:        instance,
				InstanceDataDir: dataDir,
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
	sql := "select TYPE, INSTANCE from INFORMATION_SCHEMA.CLUSTER_INFO;"
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}

	hostMap := make(HostMap, 0)
	for _, row := range rows {
		ip := parseIP(row[1])
		var list []Instance
		if instances, ok := hostMap[ip]; ok {
			list = instances
		}

		list = append(list, Instance{
			Address:    row[1],
			ServerType: row[0],
		})
		hostMap[ip] = list
	}

	return hostMap, nil
}

type CPUCoreMap map[string]int

func loadCPUCores(db *gorm.DB) (CPUCoreMap, error) {
	sql := "select INSTANCE, VALUE from INFORMATION_SCHEMA.CLUSTER_HARDWARE where name = 'cpu-logical-cores';"
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}

	var m = make(CPUCoreMap, 0)
	for _, row := range rows {
		ip := parseIP(row[0])
		cores, err := strconv.Atoi(row[1])
		if err != nil {
			continue
		}
		m[ip] = cores
	}

	return m, nil
}

func parseIP(addr string) string {
	return strings.Split(addr, ":")[0]
}

type MemoryMap map[string]Memory

func loadMemory(db *gorm.DB) (MemoryMap, error) {
	sql := "select INSTANCE, NAME, VALUE from INFORMATION_SCHEMA.CLUSTER_LOAD where device_type = 'memory' and device_name = 'virtual';"
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}

	var m = make(MemoryMap, 0)
	for _, row := range rows {
		ip := parseIP(row[0])

		var memory Memory
		var ok bool
		if memory, ok = m[ip]; !ok {
			memory = Memory{}
		}

		switch row[1] {
		case "total":
			memory.Total, err = strconv.Atoi(row[2])
			if err != nil {
				continue
			}
		case "used":
			memory.Used, err = strconv.Atoi(row[2])
			if err != nil {
				continue
			}
		default:
			continue
		}
		m[ip] = memory
	}

	return m, nil
}

type CPUUsageMap map[string]CPUUsage

func loadCPUUsage(db *gorm.DB) (CPUUsageMap, error) {
	sql := "select INSTANCE, NAME, VALUE from INFORMATION_SCHEMA.CLUSTER_LOAD where device_type = 'cpu' and device_name = 'usage';"
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}

	var m = make(CPUUsageMap, 0)
	for _, row := range rows {
		ip := parseIP(row[0])

		var cpu CPUUsage
		var ok bool
		if cpu, ok = m[ip]; !ok {
			cpu = CPUUsage{}
		}

		switch row[1] {
		case "system":
			cpu.System, err = strconv.ParseFloat(row[2], 64)
			if err != nil {
				continue
			}
		case "idle":
			cpu.Idle, err = strconv.ParseFloat(row[2], 64)
			if err != nil {
				continue
			}
		default:
			continue
		}
		m[ip] = cpu
	}

	return m, nil
}

type PartitionMap map[string]Partition

func queryPartition(db *gorm.DB, instance Instance) (PartitionMap, error) {
	sql := fmt.Sprintf("select DEVICE_NAME, NAME, VALUE from INFORMATION_SCHEMA.CLUSTER_HARDWARE where type = '%s' and instance = '%s' and device_type = 'disk';",
		instance.ServerType,
		instance.Address,
	)
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}

	var m = make(PartitionMap, 0)
	for _, row := range rows {
		name := row[0]

		var partition Partition
		var ok bool
		if partition, ok = m[name]; !ok {
			partition = Partition{}
		}

		switch row[1] {
		case "fstype":
			partition.FSType = row[2]
		case "path":
			partition.Path = row[2]
		case "total":
			partition.Total, err = strconv.Atoi(row[2])
			if err != nil {
				continue
			}
		case "free":
			partition.Free, err = strconv.Atoi(row[2])
			if err != nil {
				continue
			}
		default:
			continue
		}

		m[name] = partition
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
	rows, err := querySQL(db, sql)
	if err != nil {
		return "", err
	}
	return rows[0][0], nil
}

func querySQL(db *gorm.DB, sql string) ([][]string, error) {
	if len(sql) == 0 {
		return nil, nil
	}

	rows, err := db.Raw(sql).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	// Read all rows.
	resultRows := make([][]string, 0, 2)
	for rows.Next() {
		cols, err1 := rows.Columns()
		if err1 != nil {
			return nil, err
		}

		// See https://stackoverflow.com/questions/14477941/read-select-columns-into-string-in-go
		rawResult := make([][]byte, len(cols))
		dest := make([]interface{}, len(cols))
		for i := range rawResult {
			dest[i] = &rawResult[i]
		}

		err1 = rows.Scan(dest...)
		if err1 != nil {
			return nil, err
		}

		resultRow := []string{}
		for _, raw := range rawResult {
			val := ""
			if raw != nil {
				val = string(raw)
			}

			resultRow = append(resultRow, val)
		}
		resultRows = append(resultRows, resultRow)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	return resultRows, nil
}
