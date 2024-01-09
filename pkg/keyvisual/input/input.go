// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Package input defines several different data inputs.
package input

import (
	"context"
	"time"

	"github.com/pingcap/log"

	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/region"
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/storage"
)

// StatInput is the interface that different data inputs need to implement.
type StatInput interface {
	GetStartTime() time.Time
	Background(ctx context.Context, stat *storage.Stat)
}

func NewStatInput(provider *region.DataProvider) StatInput {
	if provider.FileStartTime == 0 && provider.FileEndTime == 0 {
		if provider.PeriodicGetter == nil {
			log.Fatal("Empty DataProvider is not allowed")
		}
		return PeriodicInput(provider.PeriodicGetter)
	}
	startTime := time.Unix(provider.FileStartTime, 0)
	endTime := time.Unix(provider.FileEndTime, 0)
	return FileInput(startTime, endTime)
}
