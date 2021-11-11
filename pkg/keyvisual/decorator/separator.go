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

package decorator

import (
	"strings"
	"sync/atomic"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/config"
)

// SeparatorLabelStrategy implements the LabelStrategy interface. It obtains label information after splitting the key.
func SeparatorLabelStrategy(cfg *config.KeyVisualConfig) LabelStrategy {
	s := &separatorLabelStrategy{}
	s.Separator.Store(cfg.PolicyKVSeparator)
	return s
}

type separatorLabelStrategy struct {
	Separator atomic.Value
}

type separatorLabeler struct {
	Separator string
}

// ReloadConfig reset separator.
func (s *separatorLabelStrategy) ReloadConfig(cfg *config.KeyVisualConfig) {
	s.Separator.Store(cfg.PolicyKVSeparator)
	log.Debug("Reload config", zap.String("separator", cfg.PolicyKVSeparator))
}

func (s *separatorLabelStrategy) NewLabeler() Labeler {
	return &separatorLabeler{
		Separator: s.Separator.Load().(string),
	}
}

// CrossBorder is temporarily not considering cross-border logic.
func (e *separatorLabeler) CrossBorder(startKey, endKey string) bool {
	return false
}

// Label uses separator to split key.
func (e *separatorLabeler) Label(keys []string) []LabelKey {
	labelKeys := make([]LabelKey, len(keys))
	for i, key := range keys {
		var labels []string
		if e.Separator == "" {
			labels = []string{key}
		} else {
			labels = strings.Split(key, e.Separator)
		}
		labelKeys[i] = LabelKey{
			Key:    key,
			Labels: labels,
		}
	}
	return labelKeys
}
