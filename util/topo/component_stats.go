// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"database/sql"
	"database/sql/driver"

	"github.com/pingcap/tidb-dashboard/util/jsonserde"
)

type ComponentStats map[ComponentKind]int

func CountComponents(descriptors []ComponentDescriptor) ComponentStats {
	statsByMap := map[ComponentKind]int{}
	for _, d := range descriptors {
		statsByMap[d.Kind]++
	}
	return statsByMap
}

var _ sql.Scanner = (*ComponentStats)(nil)
var _ driver.Valuer = ComponentStats{}

func (r *ComponentStats) Scan(src interface{}) error {
	return jsonserde.Default.Unmarshal([]byte(src.(string)), r)
}

func (r ComponentStats) Value() (driver.Value, error) {
	val, err := jsonserde.Default.Marshal(r)
	return string(val), err
}
