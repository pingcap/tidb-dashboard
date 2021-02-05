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

// Store may be a TiKV store or TiFlash store
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

// ReplicationStatus represents the replication mode status of the region.
type ReplicationStatus struct {
	State   string `json:"state"`
	StateID uint64 `json:"state_id"`
}

// RegionEpoch from metapb.RegionEpoch
type RegionEpoch struct {
	// Conf change version, auto increment when add or remove peer
	ConfVer uint64 `json:"conf_ver,omitempty"`
	// Region version, auto increment when split or merge
	Version uint64 `json:"version,omitempty"`
}

// Peer from metapb.Peer
type Peer struct {
	Id        uint64 `json:"id,omitempty"`
	StoreId   uint64 `json:"store_id,omitempty"`
	IsLearner bool   `json:"is_learner,omitempty"`
}

// PeerStats from pdpb.PeerStats
type PeerStats struct {
	Peer        Peer   `json:"peer,omitempty"`
	DownSeconds uint64 `json:"down_seconds,omitempty"`
}

// RawRegionInfo records detail region info for api usage.
type RawRegionInfo struct {
	ID          uint64      `json:"id"`
	StartKey    string      `json:"start_key"`
	EndKey      string      `json:"end_key"`
	RegionEpoch RegionEpoch `json:"epoch,omitempty"`
	Peers       []Peer      `json:"peers,omitempty"`

	Leader          Peer        `json:"leader,omitempty"`
	DownPeers       []PeerStats `json:"down_peers,omitempty"`
	PendingPeers    []Peer      `json:"pending_peers,omitempty"`
	WrittenBytes    uint64      `json:"written_bytes"`
	ReadBytes       uint64      `json:"read_bytes"`
	WrittenKeys     uint64      `json:"written_keys"`
	ReadKeys        uint64      `json:"read_keys"`
	ApproximateSize int64       `json:"approximate_size"`
	ApproximateKeys int64       `json:"approximate_keys"`

	//ReplicationStatus ReplicationStatus `json:"replication_status,omitempty"`
}

type RawRegionsInfo struct {
	Count   int             `json:"count"`
	Regions []RawRegionInfo `json:"regions"`
}

type StoresToRegionsInfo struct {
	ID      uint64   `json:"id"` // store id
	Address string   `json:"address"`
	GitHash string   `json:"git_hash"`
	Regions []uint64 `json:"regions"`
}

type ReplicationInfo struct {
	ID           uint64 `json:"id"`
	RegionID     uint64 `json:"region_id"`
	StoreID      uint64 `json:"store_id"`
	StoreAddress string `json:"store_address"`

	// Region Common Meta
	LeaderID      uint64 `json:"leader_id"`

	StartKey string `json:"start_key"`
	EndKey   string `json:"end_key"`

	WrittenBytes    uint64 `json:"written_bytes"`
	ReadBytes       uint64 `json:"read_bytes"`
	WrittenKeys     uint64 `json:"written_keys"`
	ReadKeys        uint64 `json:"read_keys"`
	ApproximateSize int64  `json:"approximate_size"`
	ApproximateKeys int64  `json:"approximate_keys"`
}

type RegionInfo struct {
	ID       uint64 `json:"id"`
	StartKey string `json:"start_key"`
	EndKey   string `json:"end_key"`

	WrittenBytes    uint64 `json:"written_bytes"`
	ReadBytes       uint64 `json:"read_bytes"`
	WrittenKeys     uint64 `json:"written_keys"`
	ReadKeys        uint64 `json:"read_keys"`
	ApproximateSize int64  `json:"approximate_size"`
	ApproximateKeys int64  `json:"approximate_keys"`

	LeaderID      uint64 `json:"leader_id"`
	LeaderStoreID uint64 `json:"leader_store_id"`

	Replications        string `json:"replications"`
	PendingReplications string `json:"pending_replications"`
	DownReplications    string `json:"down_replications"`

	ReplicationCount        int `json:"replication_count"`
	PendingReplicationCount int `json:"pending_replication_count"`
	DownReplicationCount    int `json:"down_replication_count"`
}
