// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Package decorator contains all implementations of LabelStrategy.
package decorator

import (
	"encoding/hex"

	"github.com/pingcap/tidb-dashboard/pkg/config"
)

// LabelKey is the decoration key.
type LabelKey struct {
	Key    string   `json:"key" binding:"required"`
	Labels []string `json:"labels" binding:"required"`
}

// LabelStrategy requires cross-border determination and key decoration scheme.
// It supports dynamic reload configuration and generation of an actuator.
type LabelStrategy interface {
	ReloadConfig(cfg *config.KeyVisualConfig)
	NewLabeler() Labeler
}

// Labeler is an executor of LabelStrategy, and its functions should not be called concurrently.
type Labeler interface {
	// CrossBorder determines whether two keys not belong to the same logical range.
	CrossBorder(startKey, endKey string) bool
	// Label returns the Label information of the keys.
	Label(keys []string) []LabelKey
}

// NaiveLabelStrategy is one of the simplest LabelStrategy.
func NaiveLabelStrategy() LabelStrategy {
	return naiveLabelStrategy{}
}

type naiveLabelStrategy struct{}

type naiveLabeler struct{}

func (s naiveLabelStrategy) ReloadConfig(_ *config.KeyVisualConfig) {}

func (s naiveLabelStrategy) NewLabeler() Labeler {
	return naiveLabeler{}
}

// CrossBorder always returns false. So naiveLabelStrategy believes that there are no cross-border situations.
func (e naiveLabeler) CrossBorder(_, _ string) bool {
	return false
}

// Label only encodes the keys.
func (e naiveLabeler) Label(keys []string) []LabelKey {
	labelKeys := make([]LabelKey, len(keys))
	for i, key := range keys {
		str := hex.EncodeToString([]byte(key))
		labelKeys[i] = LabelKey{
			Key:    str,
			Labels: []string{str},
		}
	}
	return labelKeys
}
