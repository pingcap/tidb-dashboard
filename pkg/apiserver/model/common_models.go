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

package model

import (
	"fmt"
	"strings"
)

type NodeKind string

const (
	NodeKindTiDB    NodeKind = "tidb"
	NodeKindTiKV    NodeKind = "tikv"
	NodeKindPD      NodeKind = "pd"
	NodeKindTiFlash NodeKind = "tiflash"
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
	displayName := strings.NewReplacer(".", "_", ":", "_").Replace(n.DisplayName)
	return fmt.Sprintf("%s_%s", n.Kind, displayName)
}

type RequestTargetStatistics struct {
	NumTiKVNodes    int `json:"num_tikv_nodes"`
	NumTiDBNodes    int `json:"num_tidb_nodes"`
	NumPDNodes      int `json:"num_pd_nodes"`
	NumTiFlashNodes int `json:"num_tiflash_nodes"`
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
		}
	}
	return stats
}
