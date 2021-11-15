// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package topo

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

// StoreInfo may be either a TiKV store info or a TiFlash store info.
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

type StandardComponentInfo struct {
	IP   string `json:"ip"`
	Port uint   `json:"port"`
}

type AlertManagerInfo StandardComponentInfo

type GrafanaInfo StandardComponentInfo

type PrometheusInfo StandardComponentInfo
