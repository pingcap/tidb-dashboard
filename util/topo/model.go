// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package topo

type CompStatus string

const (
	CompStatusUnknown     CompStatus = "unknown"
	CompStatusUnreachable CompStatus = "unreachable"
	CompStatusUp          CompStatus = "up"
	CompStatusTombstone   CompStatus = "tombstone"
	CompStatusLeaving     CompStatus = "leaving"
	CompStatusDown        CompStatus = "down"
)

type Kind string

const (
	KindTiDB         Kind = "tidb"
	KindTiKV         Kind = "tikv"
	KindPD           Kind = "pd"
	KindTiFlash      Kind = "tiflash"
	KindTiCDC        Kind = "ticdc"
	KindTiProxy      Kind = "tiproxy"
	KindTSO          Kind = "tso"
	KindScheduling   Kind = "scheduling"
	KindAlertManager Kind = "alert_manager"
	KindGrafana      Kind = "grafana"
	KindPrometheus   Kind = "prometheus"
)

type PDInfo struct {
	GitHash        string
	Version        string
	IP             string
	Port           uint
	DeployPath     string
	Status         CompStatus
	StartTimestamp int64 // Ts = 0 means unknown
}

var _ Info = &PDInfo{}

func (i *PDInfo) Info() CompInfo {
	return CompInfo{
		CompDescriptor: CompDescriptor{
			IP:   i.IP,
			Port: i.Port,
			Kind: KindPD,
		},
		Version: i.Version,
		Status:  i.Status,
	}
}

type TiDBInfo struct {
	GitHash        string
	Version        string
	IP             string
	Port           uint
	DeployPath     string
	Status         CompStatus
	StatusPort     uint
	StartTimestamp int64
}

var _ Info = &TiDBInfo{}

func (i *TiDBInfo) Info() CompInfo {
	return CompInfo{
		CompDescriptor: CompDescriptor{
			IP:         i.IP,
			Port:       i.Port,
			StatusPort: i.StatusPort,
			Kind:       KindTiDB,
		},
		Version: i.Version,
		Status:  i.Status,
	}
}

// StoreInfo may be either a TiKV store info or a TiFlash store info.
type StoreInfo struct {
	GitHash        string
	Version        string
	IP             string
	Port           uint
	DeployPath     string
	Status         CompStatus
	StatusPort     uint
	Labels         map[string]string
	StartTimestamp int64
}

type TiKVStoreInfo StoreInfo

var _ Info = &TiKVStoreInfo{}

func (i *TiKVStoreInfo) Info() CompInfo {
	return CompInfo{
		CompDescriptor: CompDescriptor{
			IP:         i.IP,
			Port:       i.Port,
			StatusPort: i.StatusPort,
			Kind:       KindTiKV,
		},
		Version: i.Version,
		Status:  i.Status,
	}
}

type TiFlashStoreInfo StoreInfo

var _ Info = &TiFlashStoreInfo{}

func (i *TiFlashStoreInfo) Info() CompInfo {
	return CompInfo{
		CompDescriptor: CompDescriptor{
			IP:         i.IP,
			Port:       i.Port,
			StatusPort: i.StatusPort,
			Kind:       KindTiFlash,
		},
		Version: i.Version,
		Status:  i.Status,
	}
}

type TiCDCInfo struct {
	ClusterName    string
	GitHash        string
	Version        string
	IP             string
	Port           uint
	DeployPath     string
	Status         CompStatus
	StatusPort     uint
	StartTimestamp int64
}

var _ Info = &TiCDCInfo{}

func (i *TiCDCInfo) Info() CompInfo {
	return CompInfo{
		CompDescriptor: CompDescriptor{
			IP:         i.IP,
			Port:       i.Port,
			StatusPort: i.StatusPort,
			Kind:       KindTiCDC,
		},
		Version: i.Version,
		Status:  i.Status,
	}
}

type TiProxyInfo struct {
	GitHash        string
	Version        string
	IP             string
	Port           uint
	DeployPath     string
	Status         CompStatus
	StatusPort     uint
	StartTimestamp int64
}

var _ Info = &TiProxyInfo{}

func (i *TiProxyInfo) Info() CompInfo {
	return CompInfo{
		CompDescriptor: CompDescriptor{
			IP:         i.IP,
			Port:       i.Port,
			StatusPort: i.StatusPort,
			Kind:       KindTiProxy,
		},
		Version: i.Version,
		Status:  i.Status,
	}
}

type TSOInfo struct {
	GitHash        string
	Version        string
	IP             string
	Port           uint
	DeployPath     string
	Status         CompStatus
	StartTimestamp int64
}

var _ Info = &TSOInfo{}

func (i *TSOInfo) Info() CompInfo {
	return CompInfo{
		CompDescriptor: CompDescriptor{
			IP:   i.IP,
			Port: i.Port,
			Kind: KindTSO,
		},
		Version: i.Version,
		Status:  i.Status,
	}
}

type SchedulingInfo struct {
	GitHash        string
	Version        string
	IP             string
	Port           uint
	DeployPath     string
	Status         CompStatus
	StartTimestamp int64
}

var _ Info = &SchedulingInfo{}

func (i *SchedulingInfo) Info() CompInfo {
	return CompInfo{
		CompDescriptor: CompDescriptor{
			IP:   i.IP,
			Port: i.Port,
			Kind: KindScheduling,
		},
		Version: i.Version,
		Status:  i.Status,
	}
}

type StandardDeployInfo struct {
	IP   string
	Port uint
}

type AlertManagerInfo StandardDeployInfo

var _ Info = &AlertManagerInfo{}

func (i *AlertManagerInfo) Info() CompInfo {
	return CompInfo{
		CompDescriptor: CompDescriptor{
			IP:   i.IP,
			Port: i.Port,
			Kind: KindAlertManager,
		},
		Version: "",
		Status:  CompStatusUnknown,
	}
}

type GrafanaInfo StandardDeployInfo

var _ Info = &GrafanaInfo{}

func (i *GrafanaInfo) Info() CompInfo {
	return CompInfo{
		CompDescriptor: CompDescriptor{
			IP:   i.IP,
			Port: i.Port,
			Kind: KindGrafana,
		},
		Version: "",
		Status:  CompStatusUnknown,
	}
}

type PrometheusInfo StandardDeployInfo

var _ Info = &PrometheusInfo{}

func (i *PrometheusInfo) Info() CompInfo {
	return CompInfo{
		CompDescriptor: CompDescriptor{
			IP:   i.IP,
			Port: i.Port,
			Kind: KindPrometheus,
		},
		Version: "",
		Status:  CompStatusUnknown,
	}
}
