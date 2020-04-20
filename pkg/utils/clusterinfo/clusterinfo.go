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

package clusterinfo

type ComponentStatus uint

const (
	// ComponentStatusUnreachable means unreachable or disconnected
	ComponentStatusUnreachable ComponentStatus = 0
	ComponentStatusUp          ComponentStatus = 1
	ComponentStatusTombstone   ComponentStatus = 2
	ComponentStatusOffline     ComponentStatus = 3

	// PD's Store may have state name down.
	ComponentStatusDown ComponentStatus = 4
)

type PDInfo struct {
	Version        string          `json:"version"`
	IP             string          `json:"ip"`
	Port           uint            `json:"port"`
	DeployPath     string          `json:"deploy_path"`
	Status         ComponentStatus `json:"status"`
	StartTimestamp int64           `json:"start_timestamp"`
}

type TiDBInfo struct {
	Version        string          `json:"version"`
	IP             string          `json:"ip"`
	Port           uint            `json:"port"`
	BinaryPath     string          `json:"binary_path"`
	Status         ComponentStatus `json:"status"`
	StatusPort     uint            `json:"status_port"`
	StartTimestamp int64           `json:"start_timestamp"`
}

type TiKVInfo struct {
	Version        string            `json:"version"`
	IP             string            `json:"ip"`
	Port           uint              `json:"port"`
	BinaryPath     string            `json:"binary_path"`
	Status         ComponentStatus   `json:"status"`
	StatusPort     uint              `json:"status_port"`
	Labels         map[string]string `json:"labels"`
	StartTimestamp int64             `json:"start_timestamp"`
}

type TiFlashInfo struct {
	Version        string            `json:"version"`
	IP             string            `json:"ip"`
	Port           uint              `json:"port"`
	BinaryPath     string            `json:"binary_path"`
	Status         ComponentStatus   `json:"status"`
	StatusPort     uint              `json:"status_port"`
	Labels         map[string]string `json:"labels"`
	StartTimestamp int64             `json:"start_timestamp"`
}

type AlertManagerInfo struct {
	IP         string `json:"ip"`
	Port       uint   `json:"port"`
	BinaryPath string `json:"binary_path"`
}

type GrafanaInfo struct {
	IP         string `json:"ip"`
	Port       uint   `json:"port"`
	BinaryPath string `json:"binary_path"`
}
