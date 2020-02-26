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
	IP         string `json:"ip"`
	Port       uint   `json:"port"`
	BinaryPath string `json:"binary_path"`
}

type Grafana struct {
	IP         string `json:"ip"`
	Port       uint   `json:"port"`
	BinaryPath string `json:"binary_path"`
}

type PD struct {
	ComponentVersionInfo
	IP         string `json:"ip"`
	Port       uint   `json:"port"`
	BinaryPath string `json:"binary_path"`
	// It will query PD's health interface.
	ServerStatus ComponentStatus `json:"server_status"`
}

type TiDB struct {
	ComponentVersionInfo
	IP           string          `json:"ip"`
	Port         uint            `json:"port"`
	BinaryPath   string          `json:"binary_path"`
	ServerStatus ComponentStatus `json:"server_status"`
	StatusPort   uint            `json:"status_port"`
}

type TiKV struct {
	ComponentVersionInfo
	IP           string            `json:"ip"`
	Port         uint              `json:"port"`
	BinaryPath   string            `json:"binary_path"`
	ServerStatus ComponentStatus   `json:"server_status"`
	StatusPort   uint              `json:"status_port"`
	Labels       map[string]string `json:"labels"`
}

type AlertManager struct {
	IP         string `json:"ip"`
	Port       uint   `json:"port"`
	BinaryPath string `json:"binary_path"`
}

type ClusterInfo struct {
	TiDB struct {
		Nodes []TiDB `json:"nodes"`
		Err   string `json:"err"`
		Error error  `json:"-"`
	} `json:"tidb"`

	TiKV struct {
		Nodes []TiKV `json:"nodes"`
		Err   string `json:"err"`
		Error error  `json:"-"`
	} `json:"tikv"`
	Pd struct {
		Nodes []PD   `json:"nodes"`
		Err   string `json:"err"`
		Error error  `json:"-"`
	} `json:"pd"`
	Grafana struct {
		Node  Grafana `json:"node"`
		Err   string  `json:"err"`
		Error error   `json:"-"`
	} `json:"grafana"`
	AlertManager struct {
		Node  AlertManager `json:"node"`
		Err   string       `json:"err"`
		Error error        `json:"-"`
	} `json:"alertManager"`
}
