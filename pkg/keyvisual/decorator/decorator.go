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

// Package decorator contains all implementations of LabelStrategy.
package decorator

import (
	"encoding/hex"
	"net/http"
	"sync"

	"github.com/pingcap/log"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/region"
)

// LabelKey is the decoration key.
type LabelKey struct {
	Key    string   `json:"key" binding:"required"`
	Labels []string `json:"labels" binding:"required"`
}

// LabelStrategy requires cross-border determination and key decoration scheme.
type LabelStrategy interface {
	ReloadConfig(cfg *config.KeyVisualConfig)
	CrossBorder(startKey, endKey string) bool
	Label(key string) LabelKey
	LabelGlobalStart() LabelKey
	LabelGlobalEnd() LabelKey
}

func BuildLabelStrategy(lc fx.Lifecycle, wg *sync.WaitGroup, cfg *config.Config, keyVisualCfg *config.KeyVisualConfig, provider *region.PDDataProvider, httpClient *http.Client) LabelStrategy {
	switch keyVisualCfg.Policy {
	case config.KeyVisualDBPolicy:
		log.Debug("BuildLabelStrategy", zap.String("Policy", keyVisualCfg.Policy))
		return TiDBLabelStrategy(lc, wg, cfg, provider, httpClient)
	case config.KeyVisualKVPolicy:
		log.Debug("BuildLabelStrategy", zap.String("Policy", keyVisualCfg.Policy),
			zap.String("Separator", keyVisualCfg.PolicyKVSeparator))
		return SeparatorLabelStrategy(keyVisualCfg)
	default:
		panic("unreachable")
	}
}

// NaiveLabelStrategy is one of the simplest LabelStrategy.
type NaiveLabelStrategy struct{}

func (s NaiveLabelStrategy) ReloadConfig(cfg *config.KeyVisualConfig) {
}

// CrossBorder always returns false. So NaiveLabelStrategy believes that there are no cross-border situations.
func (s NaiveLabelStrategy) CrossBorder(startKey, endKey string) bool {
	return false
}

// Label only decodes the key.
func (s NaiveLabelStrategy) Label(key string) LabelKey {
	str := hex.EncodeToString([]byte(key))
	return LabelKey{
		Key:    str,
		Labels: []string{str},
	}
}

func (s NaiveLabelStrategy) LabelGlobalStart() LabelKey {
	return s.Label("")
}

func (s NaiveLabelStrategy) LabelGlobalEnd() LabelKey {
	return s.Label("")
}
