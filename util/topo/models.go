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
