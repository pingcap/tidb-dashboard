// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package matrix

import (
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/decorator"
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
