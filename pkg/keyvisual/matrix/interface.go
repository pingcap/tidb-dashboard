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
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/decorator"
)

type splitTag int

const (
	splitTo  splitTag = iota // Direct assignment after split
	splitAdd                 // Add to original value after split
)

// SplitStrategy is an allocation scheme. It is used to generate a Splitter for a plane to split a chunk of columns.
type SplitStrategy interface {
	NewSplitter(chunks []chunk, compactKeys []string) Splitter
}

type Splitter interface {
	// Split a chunk of columns.
	Split(dst, src chunk, tag splitTag, axesIndex int)
}

// Strategy is part of the customizable strategy in Matrix generation.
type Strategy struct {
	decorator.LabelStrategy
	SplitStrategy
}
