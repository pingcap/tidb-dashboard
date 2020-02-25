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
	Up        ComponentStatus = 0
	Offline   ComponentStatus = 1
	Tombstone ComponentStatus = 2
	Unknown   ComponentStatus = 3
)

// ServerVersionInfo is the server version and git_hash.
type ComponentVersionInfo struct {
	Version string `json:"version"`
	GitHash string `json:"git_hash"`
}

type Common struct {
	DeployCommon
	// This field is copied from tidb.
	ComponentVersionInfo
	ServerStatus ComponentStatus `json:"server_status"`
}

type DeployCommon struct {
	IP         string `json:"ip"`
	Port       uint   `json:"port"`
	BinaryPath string `json:"binary_path"`
}

type Grafana struct {
	DeployCommon
}

type PD struct {
	DeployCommon
	Version string `json:"version"`
	// It will query PD's health interface.
	ServerStatus ComponentStatus `json:"server_status"`
}

type Prometheus struct {
	DeployCommon
}

type TiDB struct {
	Common
	StatusPort uint `json:"status_port"`
}

type TiKV struct {
	ComponentVersionInfo
	DeployCommon
	ServerStatus ComponentStatus   `json:"server_status"`
	StatusPort   uint              `json:"status_port"`
	Labels       map[string]string `json:"labels"`
}

type AlertManager struct {
	DeployCommon
}
