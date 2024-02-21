// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package topology

type ComponentStatus uint

const (
	ComponentStatusUnreachable ComponentStatus = 0
	ComponentStatusUp          ComponentStatus = 1
	ComponentStatusTombstone   ComponentStatus = 2
	ComponentStatusOffline     ComponentStatus = 3
	ComponentStatusDown        ComponentStatus = 4
)

type PDInfo struct {
	GitHash        string          `json:"git_hash"`
	Version        string          `json:"version"`
	IP             string          `json:"ip"`
	Port           uint            `json:"port"`
	DeployPath     string          `json:"deploy_path"`
	Status         ComponentStatus `json:"status"`
	StartTimestamp int64           `json:"start_timestamp"` // Ts = 0 means unknown
}

type TiDBInfo struct {
	GitHash        string          `json:"git_hash"`
	Version        string          `json:"version"`
	IP             string          `json:"ip"`
	Port           uint            `json:"port"`
	DeployPath     string          `json:"deploy_path"`
	Status         ComponentStatus `json:"status"`
	StatusPort     uint            `json:"status_port"`
	StartTimestamp int64           `json:"start_timestamp"`
}

type TiCDCInfo struct {
	ClusterName    string          `json:"cluster_name"`
	GitHash        string          `json:"git_hash"`
	Version        string          `json:"version"`
	IP             string          `json:"ip"`
	Port           uint            `json:"port"`
	DeployPath     string          `json:"deploy_path"`
	Status         ComponentStatus `json:"status"`
	StatusPort     uint            `json:"status_port"`
	StartTimestamp int64           `json:"start_timestamp"`
}

type TiProxyInfo struct {
	GitHash        string          `json:"git_hash"`
	Version        string          `json:"version"`
	IP             string          `json:"ip"`
	Port           uint            `json:"port"`
	DeployPath     string          `json:"deploy_path"`
	Status         ComponentStatus `json:"status"`
	StatusPort     uint            `json:"status_port"`
	StartTimestamp int64           `json:"start_timestamp"`
}

type TSOInfo struct {
	GitHash        string          `json:"git_hash"`
	Version        string          `json:"version"`
	IP             string          `json:"ip"`
	Port           uint            `json:"port"`
	DeployPath     string          `json:"deploy_path"`
	Status         ComponentStatus `json:"status"`
	StartTimestamp int64           `json:"start_timestamp"`
}

type SchedulingInfo struct {
	GitHash        string          `json:"git_hash"`
	Version        string          `json:"version"`
	IP             string          `json:"ip"`
	Port           uint            `json:"port"`
	DeployPath     string          `json:"deploy_path"`
	Status         ComponentStatus `json:"status"`
	StartTimestamp int64           `json:"start_timestamp"`
}

// Store may be a TiKV store or TiFlash store.
type StoreInfo struct {
	GitHash        string            `json:"git_hash"`
	Version        string            `json:"version"`
	IP             string            `json:"ip"`
	Port           uint              `json:"port"`
	DeployPath     string            `json:"deploy_path"`
	Status         ComponentStatus   `json:"status"`
	StatusPort     uint              `json:"status_port"`
	Labels         map[string]string `json:"labels"`
	StartTimestamp int64             `json:"start_timestamp"`
}

type StoreLabels struct {
	Address string            `json:"address"`
	Labels  map[string]string `json:"labels"`
}

type StoreLocation struct {
	LocationLabels []string      `json:"location_labels"`
	Stores         []StoreLabels `json:"stores"`
}

type StandardComponentInfo struct {
	IP   string `json:"ip"`
	Port uint   `json:"port"`
}

type AlertManagerInfo struct {
	StandardComponentInfo
}

type GrafanaInfo struct {
	StandardComponentInfo
}

type PrometheusInfo struct {
	StandardComponentInfo
}
