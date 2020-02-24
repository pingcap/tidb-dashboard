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

type averageHelper struct {
}

type averageStrategy struct {
	decorator.LabelStrategy
}

// AverageStrategy adopts the strategy of equal distribution when buckets are split.
func AverageStrategy(label decorator.LabelStrategy) Strategy {
	return averageStrategy{
		LabelStrategy: label,
	}
}

func (averageStrategy) GenerateHelper(chunks []chunk, compactKeys []string) interface{} {
	return averageHelper{}
}

func (averageStrategy) Split(dst, src chunk, tag splitTag, axesIndex int, helper interface{}) {
	CheckPartOf(dst.Keys, src.Keys)

	if len(dst.Keys) == len(src.Keys) {
		switch tag {
		case splitTo:
			copy(dst.Values, src.Values)
		case splitAdd:
			for i, v := range src.Values {
				dst.Values[i] += v
			}
		default:
			panic("unreachable")
		}
		return
	}

	start := 0
	for startKey := src.Keys[0]; !equal(dst.Keys[start], startKey); {
		start++
	}
	end := start + 1

	switch tag {
	case splitTo:
		for i, key := range src.Keys[1:] {
			for !equal(dst.Keys[end], key) {
				end++
			}
			value := src.Values[i] / uint64(end-start)
			for ; start < end; start++ {
				dst.Values[start] = value
			}
			end++
		}
	case splitAdd:
		for i, key := range src.Keys[1:] {
			for !equal(dst.Keys[end], key) {
				end++
			}
			value := src.Values[i] / uint64(end-start)
			for ; start < end; start++ {
				dst.Values[start] += value
			}
			end++
		}
	default:
		panic("unreachable")
	}
}
