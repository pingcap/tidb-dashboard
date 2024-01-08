// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Package matrix abstracts the source data as Plane, and then pixelates it into a matrix for display on the front end.
package matrix

import (
	"time"

	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/decorator"
)

// Matrix is the front end displays the required data.
type Matrix struct {
	Keys     []string              `json:"-"`
	DataMap  map[string][][]uint64 `json:"data" binding:"required"`
	KeyAxis  []decorator.LabelKey  `json:"keyAxis" binding:"required"`
	TimeAxis []int64               `json:"timeAxis" binding:"required"`
}

// CreateMatrix uses the specified times and keys to build an initial matrix with no data.
func CreateMatrix(labeler decorator.Labeler, times []time.Time, keys []string, valuesListLen int) Matrix {
	dataMap := make(map[string][][]uint64, valuesListLen)
	// collect label keys
	keyAxis := labeler.Label(keys)
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
