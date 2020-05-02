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
	"go.uber.org/zap"

	"go.uber.org/fx"

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
	ReloadConfig(cfg *config.Config)
	CrossBorder(startKey, endKey string) bool
	Label(key string) LabelKey
	LabelGlobalStart() LabelKey
	LabelGlobalEnd() LabelKey
}

const (
	DBMode = "db"
	KVMode = "kv"
)

var Mode = []string{DBMode, KVMode}

func ValidateMode(mode string) bool {
	for _, m := range Mode {
		if m == mode {
			return true
		}
	}
	return false
}

func BuildLabelStrategy(lc fx.Lifecycle, wg *sync.WaitGroup, cfg *config.Config, provider *region.PDDataProvider, httpClient *http.Client) LabelStrategy {
	switch cfg.DecoratorMode {
	case "db":
		log.Info("BuildLabelStrategy", zap.String("mode", "db"))
		return TiDBLabelStrategy(lc, wg, cfg, provider, httpClient)
	case "kv":
		log.Info("BuildLabelStrategy", zap.String("mode", "kv"), zap.String("Sep", cfg.KVSeparator))
		return SeparatorLabelStrategy(cfg)
	default:
		panic("unreachable")
	}
}

// NaiveLabelStrategy is one of the simplest LabelStrategy.
type NaiveLabelStrategy struct{}

func (s NaiveLabelStrategy) ReloadConfig(cfg *config.Config) {
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
