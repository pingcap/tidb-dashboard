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
