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

package input

import (
	"context"
	"time"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/region"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/storage"
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
				log.Error("can not get RegionsInfo", zap.Error(err))
				continue
			}
			endTime := time.Now()
			stat.Append(regions, endTime)
		}
	}
}
