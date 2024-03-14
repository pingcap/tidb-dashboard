// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package model

import (
	"fmt"
	"strings"
)

type NodeKind string

const (
	NodeKindTiDB       NodeKind = "tidb"
	NodeKindTiKV       NodeKind = "tikv"
	NodeKindPD         NodeKind = "pd"
	NodeKindTiFlash    NodeKind = "tiflash"
	NodeKindTiCDC      NodeKind = "ticdc"
	NodeKindTiProxy    NodeKind = "tiproxy"
	NodeKindTSO        NodeKind = "tso"
	NodeKindScheduling NodeKind = "scheduling"
)

type RequestTargetNode struct {
	Kind        NodeKind `json:"kind" gorm:"size:8" example:"tidb"`
	DisplayName string   `json:"display_name" gorm:"size:32" example:"127.0.0.1:4000"`
	IP          string   `json:"ip" gorm:"size:32" example:"127.0.0.1"`
	Port        int      `json:"port" example:"4000"`
}

func (n *RequestTargetNode) String() string {
	return fmt.Sprintf("%s(%s)", n.Kind, n.DisplayName)
}

func (n *RequestTargetNode) FileName() string {
	displayName := strings.NewReplacer(":", "_").Replace(n.DisplayName)
	return fmt.Sprintf("%s_%s", n.Kind, displayName)
}

type RequestTargetStatistics struct {
	NumTiKVNodes       int `json:"num_tikv_nodes"`
	NumTiDBNodes       int `json:"num_tidb_nodes"`
	NumPDNodes         int `json:"num_pd_nodes"`
	NumTiFlashNodes    int `json:"num_tiflash_nodes"`
	NumTiCDCNodes      int `json:"num_ticdc_nodes"`
	NumTiProxyNodes    int `json:"num_tiproxy_nodes"`
	NumTSONodes        int `json:"num_tso_nodes"`
	NumSchedulingNodes int `json:"num_scheduling_nodes"`
}

func NewRequestTargetStatisticsFromArray(arr *[]RequestTargetNode) RequestTargetStatistics {
	stats := RequestTargetStatistics{}
	for _, node := range *arr {
		switch node.Kind {
		case NodeKindTiDB:
			stats.NumTiDBNodes++
		case NodeKindTiKV:
			stats.NumTiKVNodes++
		case NodeKindPD:
			stats.NumPDNodes++
		case NodeKindTiFlash:
			stats.NumTiFlashNodes++
		case NodeKindTiCDC:
			stats.NumTiCDCNodes++
		case NodeKindTiProxy:
			stats.NumTiProxyNodes++
		case NodeKindTSO:
			stats.NumTSONodes++
		case NodeKindScheduling:
			stats.NumSchedulingNodes++
		}
	}
	return stats
}
