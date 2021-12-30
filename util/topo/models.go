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

type ComponentKind string

const (
	KindTiDB         ComponentKind = "tidb"
	KindTiKV         ComponentKind = "tikv"
	KindPD           ComponentKind = "pd"
	KindTiFlash      ComponentKind = "tiflash"
	KindAlertManager ComponentKind = "alert_manager"
	KindGrafana      ComponentKind = "grafana"
	KindPrometheus   ComponentKind = "prometheus"
)

type ComponentDescriptor struct {
	IP   string        `json:"ip"`
	Port uint          `json:"port"`
	Kind ComponentKind `json:"kind"`
}

type PDInfo struct {
	GitHash        string          `json:"git_hash"`
	Version        string          `json:"version"`
	IP             string          `json:"ip"`
	Port           uint            `json:"port"`
	DeployPath     string          `json:"deploy_path"`
	Status         ComponentStatus `json:"status"`
	StartTimestamp int64           `json:"start_timestamp"` // Ts = 0 means unknown
}

func (i *PDInfo) Describe() ComponentDescriptor {
	return ComponentDescriptor{
		IP:   i.IP,
		Port: i.Port,
		Kind: KindPD,
	}
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

func (i *TiDBInfo) Describe() ComponentDescriptor {
	return ComponentDescriptor{
		IP:   i.IP,
		Port: i.Port,
		Kind: KindTiDB,
	}
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

type TiKVStoreInfo StoreInfo

func (i *TiKVStoreInfo) Describe() ComponentDescriptor {
	return ComponentDescriptor{
		IP:   i.IP,
		Port: i.Port,
		Kind: KindTiKV,
	}
}

type TiFlashStoreInfo StoreInfo

func (i *TiFlashStoreInfo) Describe() ComponentDescriptor {
	return ComponentDescriptor{
		IP:   i.IP,
		Port: i.Port,
		Kind: KindTiFlash,
	}
}

type StandardComponentInfo struct {
	IP   string `json:"ip"`
	Port uint   `json:"port"`
}

type AlertManagerInfo StandardComponentInfo

func (i *AlertManagerInfo) Describe() ComponentDescriptor {
	return ComponentDescriptor{
		IP:   i.IP,
		Port: i.Port,
		Kind: KindAlertManager,
	}
}

type GrafanaInfo StandardComponentInfo

func (i *GrafanaInfo) Describe() ComponentDescriptor {
	return ComponentDescriptor{
		IP:   i.IP,
		Port: i.Port,
		Kind: KindGrafana,
	}
}

type PrometheusInfo StandardComponentInfo

func (i *PrometheusInfo) Describe() ComponentDescriptor {
	return ComponentDescriptor{
		IP:   i.IP,
		Port: i.Port,
		Kind: KindPrometheus,
	}
}
