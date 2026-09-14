// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package model

import (
	"fmt"
	"net/netip"
	"strings"
	"unicode"
	"unicode/utf8"
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

// Validate checks that a target can safely be used as a network host and port.
func (n RequestTargetNode) Validate() error {
	if !validHost(n.IP) {
		return fmt.Errorf("invalid target host")
	}
	if n.Port < 1 || n.Port > 65535 {
		return fmt.Errorf("invalid target port")
	}
	return nil
}

func validHost(host string) bool {
	if host == "" || strings.TrimSpace(host) != host || !utf8.ValidString(host) {
		return false
	}
	if addr, err := netip.ParseAddr(host); err == nil {
		return addr.Zone() == "" || validIPv6Zone(addr.Zone())
	}

	host = strings.TrimSuffix(host, ".")
	if host == "" || len(host) > 253 || strings.Contains(host, ":") {
		return false
	}
	for _, label := range strings.Split(host, ".") {
		if len(label) == 0 || len(label) > 63 || label[0] == '-' || label[len(label)-1] == '-' {
			return false
		}
		for _, c := range label {
			if c != '_' && c != '-' && !unicode.IsLetter(c) && !unicode.IsDigit(c) {
				return false
			}
		}
	}
	return true
}

func validIPv6Zone(zone string) bool {
	if zone == "" || !utf8.ValidString(zone) {
		return false
	}
	for _, c := range zone {
		if !unicode.IsLetter(c) && !unicode.IsDigit(c) && c != '_' && c != '-' && c != '.' {
			return false
		}
	}
	return true
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
