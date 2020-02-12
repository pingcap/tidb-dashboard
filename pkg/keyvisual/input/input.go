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

// Package input defines several different data inputs.
package input

import (
	"time"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/storage"
)

// StatInput is the interface that different data inputs need to implement.
type StatInput interface {
	GetStartTime() time.Time
	Background(stat *storage.Stat)
}

func NewStatInput(cfg *config.Config) StatInput {
	if cfg.KeyVisualConfig.PeriodicGetter != nil {
		return PeriodicInput(cfg.Ctx, cfg.KeyVisualConfig.PeriodicGetter)
	}
	startTime := time.Unix(cfg.KeyVisualConfig.FileStartTime, 0)
	endTime := time.Unix(cfg.KeyVisualConfig.FileEndTime, 0)
	return FileInput(startTime, endTime)
}
