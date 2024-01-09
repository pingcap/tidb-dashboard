// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package input

import (
	"context"
	"time"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/region"
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/storage"
)

type periodicInput struct {
	PeriodicGetter region.RegionsInfoGenerator
}

func PeriodicInput(periodicGetter region.RegionsInfoGenerator) StatInput {
	return &periodicInput{
		PeriodicGetter: periodicGetter,
	}
}

func (input *periodicInput) GetStartTime() time.Time {
	return time.Now()
}

func (input *periodicInput) Background(ctx context.Context, stat *storage.Stat) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			regions, err := input.PeriodicGetter()
			if err != nil {
				log.Warn("can not get RegionsInfo", zap.Error(err))
				continue
			}
			endTime := time.Now()
			stat.Append(regions, endTime)
		}
	}
}
