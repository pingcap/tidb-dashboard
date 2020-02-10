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

package logsearch

import (
	"sort"
	"testing"

	"github.com/pingcap/kvproto/pkg/diagnosticspb"
)

func TestMerge(t *testing.T) {
	cases := [][]int64{
		{10, 20, 30},
		{12, 22, 32, 36},
		{5, 15, 25, 35},
	}
	task := TaskModel{Component: &Component{}}
	lists := make([]*LogPreview, 0)
	for _, times := range cases {
		preview := make([]PreviewModel, 0)
		for _, time := range times {
			preview = append(preview, PreviewModel{
				Message: &diagnosticspb.LogMessage{
					Time: time,
				},
			})
		}
		lists = append(lists, &LogPreview{
			task:    task,
			preview: preview,
		})
	}
	res := mergeLines(lists)

	if !sort.SliceIsSorted(res, func(i, j int) bool {
		return res[i].Message.Time < res[j].Message.Time
	}) {
		t.Fail()
	}
}
