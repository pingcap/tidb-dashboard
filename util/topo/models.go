// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"database/sql"
	"database/sql/driver"
	"fmt"
	"strings"

	"github.com/pingcap/tidb-dashboard/util/jsonserde"
)

type ComponentStatus string

const (
	ComponentStatusUnreachable ComponentStatus = "unreachable"
	ComponentStatusUp          ComponentStatus = "up"
	ComponentStatusTombstone   ComponentStatus = "tombstone"
	ComponentStatusLeaving     ComponentStatus = "leaving"
	ComponentStatusDown        ComponentStatus = "down"
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

// ComponentDescriptor provides the minimal basic information about a component.
type ComponentDescriptor struct {
	IP         string
	Port       uint
	StatusPort uint
	Kind       ComponentKind
	// Extreme care should be taken when adding more fields here, as this descriptor is widely used or persisted.
}

var (
	_ sql.Scanner   = (*ComponentDescriptor)(nil)
	_ driver.Valuer = ComponentDescriptor{}
)

func (cd *ComponentDescriptor) Scan(src interface{}) error {
	return jsonserde.Default.Unmarshal([]byte(src.(string)), cd)
}

func (cd ComponentDescriptor) Value() (driver.Value, error) {
	val, err := jsonserde.Default.Marshal(cd)
	return string(val), err
}

func (cd *ComponentDescriptor) DisplayHost() string {
	return fmt.Sprintf("%s:%d", cd.IP, cd.Port)
}

func (cd *ComponentDescriptor) FileName() string {
	host := strings.NewReplacer(":", "_", ".", "_").Replace(cd.DisplayHost())
	return fmt.Sprintf("%s_%s", cd.Kind, host)
}

// Info is an interface implemented by all component info structures.
type Info interface {
	Describe() ComponentDescriptor
}

//go:generate mockery --name Info --inpackage
var _ Info = (*MockInfo)(nil)

type PDInfo struct {
	GitHash        string
	Version        string
	IP             string
	Port           uint
	DeployPath     string
	Status         ComponentStatus
	StartTimestamp int64 // Ts = 0 means unknown
}

var _ Info = &PDInfo{}

func (i *PDInfo) Describe() ComponentDescriptor {
	return ComponentDescriptor{
		IP:   i.IP,
		Port: i.Port,
		Kind: KindPD,
	}
}

type TiDBInfo struct {
	GitHash        string
	Version        string
	IP             string
	Port           uint
	DeployPath     string
	Status         ComponentStatus
	StatusPort     uint
	StartTimestamp int64
}

var _ Info = &TiDBInfo{}

func (i *TiDBInfo) Describe() ComponentDescriptor {
	return ComponentDescriptor{
		IP:         i.IP,
		Port:       i.Port,
		StatusPort: i.StatusPort,
		Kind:       KindTiDB,
	}
}

// StoreInfo may be either a TiKV store info or a TiFlash store info.
type StoreInfo struct {
	GitHash        string
	Version        string
	IP             string
	Port           uint
	DeployPath     string
	Status         ComponentStatus
	StatusPort     uint
	Labels         map[string]string
	StartTimestamp int64
}

type TiKVStoreInfo StoreInfo

var _ Info = &TiKVStoreInfo{}

func (i *TiKVStoreInfo) Describe() ComponentDescriptor {
	return ComponentDescriptor{
		IP:         i.IP,
		Port:       i.Port,
		StatusPort: i.StatusPort,
		Kind:       KindTiKV,
	}
}

type TiFlashStoreInfo StoreInfo

var _ Info = &TiFlashStoreInfo{}

func (i *TiFlashStoreInfo) Describe() ComponentDescriptor {
	return ComponentDescriptor{
		IP:         i.IP,
		Port:       i.Port,
		StatusPort: i.StatusPort,
		Kind:       KindTiFlash,
	}
}

type StandardComponentInfo struct {
	IP   string
	Port uint
}

type AlertManagerInfo StandardComponentInfo

var _ Info = &AlertManagerInfo{}

func (i *AlertManagerInfo) Describe() ComponentDescriptor {
	return ComponentDescriptor{
		IP:   i.IP,
		Port: i.Port,
		Kind: KindAlertManager,
	}
}

type GrafanaInfo StandardComponentInfo

var _ Info = &GrafanaInfo{}

func (i *GrafanaInfo) Describe() ComponentDescriptor {
	return ComponentDescriptor{
		IP:   i.IP,
		Port: i.Port,
		Kind: KindGrafana,
	}
}

type PrometheusInfo StandardComponentInfo

var _ Info = &PrometheusInfo{}

func (i *PrometheusInfo) Describe() ComponentDescriptor {
	return ComponentDescriptor{
		IP:   i.IP,
		Port: i.Port,
		Kind: KindPrometheus,
	}
}
