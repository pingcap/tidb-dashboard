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

package matrix

import (
	"encoding/hex"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/decorator"
)

type splitTag int

const (
	splitTo  splitTag = iota // Direct assignment after split
	splitAdd                 // Add to original value after split
)

// splitStrategy is an allocation scheme. GenerateHelper is used to generate a helper for a Plane. Split uses this
// helper to split a chunk of columns.
type splitStrategy interface {
	GenerateHelper(chunks []chunk, compactKeys []string) interface{}
	Split(dst, src chunk, tag splitTag, axesIndex int, helper interface{})
}

// Strategy is part of the customizable strategy in Matrix generation.
type Strategy interface {
	splitStrategy
	decorator.LabelStrategy
}

// NaiveLabelStrategy is one of the simplest LabelStrategy.
type NaiveLabelStrategy struct{}

// CrossBorder always returns false. So NaiveLabelStrategy believes that there are no cross-border situations.
func (s NaiveLabelStrategy) CrossBorder(startKey, endKey string) bool {
	return false
}

// Label only decodes the key.
func (s NaiveLabelStrategy) Label(key string) decorator.LabelKey {
	str := hex.EncodeToString([]byte(key))
	return decorator.LabelKey{
		Key:    str,
		Labels: []string{str},
	}
}

// Background do nothing.
func (s NaiveLabelStrategy) Background() {}
