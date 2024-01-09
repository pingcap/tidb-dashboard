// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package region

type RegionsInfo interface {
	Len() int
	GetKeys() []string
	GetValues(tag StatTag) []uint64
}

type RegionsInfoGenerator func() (RegionsInfo, error)

type DataProvider struct {
	// File mode (debug)
	FileStartTime int64
	FileEndTime   int64
	// API or Core mode
	// This item takes effect only when both FileStartTime and FileEndTime are 0.
	PeriodicGetter RegionsInfoGenerator
}
