// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"database/sql"
	"database/sql/driver"

	"github.com/pingcap/tidb-dashboard/util/jsonserde"
)

type CompCount map[Kind]int

func CountComponents(descriptors []CompDescriptor) CompCount {
	statsByMap := map[Kind]int{}
	for _, d := range descriptors {
		statsByMap[d.Kind]++
	}
	return statsByMap
}

var (
	_ sql.Scanner   = (*CompCount)(nil)
	_ driver.Valuer = CompCount{}
)

func (r *CompCount) Scan(src interface{}) error {
	return jsonserde.Default.Unmarshal([]byte(src.(string)), r)
}

func (r CompCount) Value() (driver.Value, error) {
	val, err := jsonserde.Default.Marshal(r)
	return string(val), err
}
