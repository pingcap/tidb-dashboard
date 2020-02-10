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
	"container/heap"

	"github.com/pingcap/kvproto/pkg/diagnosticspb"
)

type LogPreview struct {
	task    TaskModel
	preview []PreviewModel
}

type LinePreview struct {
	TaskID     string                    `json:"task_id"`
	ServerType string                    `json:"server_type"`
	Address    string                    `json:"address"`
	Message    *diagnosticspb.LogMessage `json:"message"`
}

type Node struct {
	from  int
	line  *LinePreview
	value int64
}

type Heap []Node

func (h Heap) Len() int {
	return len(h)
}

func (h Heap) Less(i, j int) bool {
	return h[i].value < h[j].value
}

func (h Heap) Swap(i, j int) {
	h[i], h[j] = h[j], h[i]
}

func (h *Heap) Push(x interface{}) {
	*h = append(*h, x.(Node))
}

func (h *Heap) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[0 : n-1]
	return x
}

func mergeLines(lists []*LogPreview) []*LinePreview {
	l := len(lists)
	h := &Heap{}
	res := make([]*LinePreview, 0, PreviewLogLinesLimit)
	currIndies := make([]int, l)
	heap.Init(h)

	for i := 0; i < l; i++ {
		if currIndies[i] < len(lists[i].preview) {
			line := &LinePreview{
				TaskID:     lists[i].task.TaskID,
				ServerType: lists[i].task.Component.ServerType,
				Address:    lists[i].task.Component.address(),
				Message:    lists[i].preview[currIndies[i]].Message,
			}
			heap.Push(h, Node{i, line, line.Message.Time})
			currIndies[i]++
		}
	}

	for h.Len() > 0 && len(res) <= PreviewLogLinesLimit {
		node := heap.Pop(h).(Node)
		res = append(res, node.line)
		i := node.from
		if currIndies[i] < len(lists[i].preview) {
			line := &LinePreview{
				TaskID:     lists[i].task.TaskID,
				ServerType: lists[i].task.Component.ServerType,
				Address:    lists[i].task.Component.address(),
				Message:    lists[i].preview[currIndies[i]].Message,
			}
			heap.Push(h, Node{i, line, line.Message.Time})
			currIndies[i]++
		}
	}
	return res
}
