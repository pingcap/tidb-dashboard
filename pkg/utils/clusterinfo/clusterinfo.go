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

// ServerVersionInfo is the server version and git_hash.
type ServerVersionInfo struct {
	Version string `json:"version"`
	GitHash string `json:"git_hash"`
}

type Common struct {
	DeployCommon
	// This field is copied from tidb.
	ServerVersionInfo
	ServerStatus string `json:"server_status"`
}

type DeployCommon struct {
	IP         string `json:"ip"`
	Port       string `json:"port"`
	BinaryPath string `json:"binary_path"`
}

type Grafana struct {
	DeployCommon
}

type PD struct {
	DeployCommon
	Version string `json:"version"`
	// It will query PD's health interface.
	ServerStatus string `json:"server_status"`
}

type Prometheus struct {
	DeployCommon
}

type TiDB struct {
	Common
	StatusPort string `json:"status_port"`
}

type TiKV struct {
	// This field is copied from tidb.
	ServerVersionInfo
	ServerStatus string `json:"server_status"`
	IP           string
	Port         string
	BinaryPath   string `json:"binary_path"`
	StatusPort   string `json:"status_port"`

	Labels map[string]string `json:"labels"`
}

type AlertManager struct {
	DeployCommon
}
