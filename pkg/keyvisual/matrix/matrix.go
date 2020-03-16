// Copyright 2019 PingCAP, Inc.
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

// Package matrix abstracts the source data as Plane, and then pixelates it into a matrix for display on the front end.
package matrix

import (
	"time"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/decorator"
)

// Matrix is the front end displays the required data.
type Matrix struct {
	Keys     []string              `json:"-"`
	DataMap  map[string][][]uint64 `json:"data" binding:"required"`
	KeyAxis  []decorator.LabelKey  `json:"keyAxis" binding:"required"`
	TimeAxis []int64               `json:"timeAxis" binding:"required"`
}

// CreateMatrix uses the specified times and keys to build an initial matrix with no data.
func CreateMatrix(strategy Strategy, times []time.Time, keys []string, valuesListLen int) Matrix {
	dataMap := make(map[string][][]uint64, valuesListLen)
	// collect label keys
	keyAxis := make([]decorator.LabelKey, len(keys))
	for i, key := range keys {
		keyAxis[i] = strategy.Label(key)
	}

	if keys[0] == "" {
		keyAxis[0] = strategy.LabelGlobalStart()
	}
	endIndex := len(keys) - 1
	if keys[endIndex] == "" {
		keyAxis[endIndex] = strategy.LabelGlobalEnd()
	}

	// collect unix times
	timeAxis := make([]int64, len(times))
	for i, t := range times {
		timeAxis[i] = t.Unix()
	}
	return Matrix{
		Keys:     keys,
		DataMap:  dataMap,
		KeyAxis:  keyAxis,
		TimeAxis: timeAxis,
	}
}

// Range returns a sub Matrix with specified range.
func (mx *Matrix) Range(startKey, endKey string) {
	start, end, ok := KeysRange(mx.Keys, startKey, endKey)
	if !ok {
		panic("unreachable")
	}
	mx.Keys = mx.Keys[start:end]
	mx.KeyAxis = mx.KeyAxis[start:end]
	for _, data := range mx.DataMap {
		for i, axis := range data {
			data[i] = axis[start : end-1]
		}
	}
}
