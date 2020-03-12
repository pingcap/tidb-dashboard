package utils

import (
	"fmt"
	"strings"
)

type NodeKind string

const (
	NodeKindTiDB NodeKind = "tidb"
	NodeKindTiKV NodeKind = "tikv"
	NodeKindPD   NodeKind = "pd"
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
