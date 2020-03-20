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
	"context"
	"math"
	"runtime"
	"sort"
	"sync"

	"go.uber.org/fx"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/decorator"
)

// TODO:
// * Multiplexing data between requests
// * Limit memory usage

type distanceHelper struct {
	Scale [][]float64
}

type distanceStrategy struct {
	decorator.LabelStrategy

	SplitRatio float64
	SplitLevel int
	SplitCount int

	SplitRatioPow []float64

	ScaleWorkers []chan *scaleTask
}

// DistanceStrategy adopts the strategy that the closer the split time is to the current time, the more traffic is
// allocated, when buckets are split.
func DistanceStrategy(lc fx.Lifecycle, wg *sync.WaitGroup, label decorator.LabelStrategy, ratio float64, level int, count int) Strategy {
	pow := make([]float64, level)
	for i := range pow {
		pow[i] = math.Pow(ratio, float64(i))
	}
	s := &distanceStrategy{
		LabelStrategy: label,
		SplitRatio:    ratio,
		SplitLevel:    level,
		SplitCount:    count,
		SplitRatioPow: pow,
		ScaleWorkers:  make([]chan *scaleTask, workerCount),
	}

	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			s.StartWorkers(wg)
			return nil
		},
		OnStop: func(context.Context) error {
			s.StopWorkers()
			return nil
		},
	})

	return s
}

func (s *distanceStrategy) GenerateHelper(chunks []chunk, compactKeys []string) interface{} {
	axesLen := len(chunks)
	keysLen := len(compactKeys)

	// generate key distance matrix
	dis := make([][]int, axesLen)
	for i := 0; i < axesLen; i++ {
		dis[i] = make([]int, keysLen)
	}

	// a column with the maximum value is virtualized on the right and left
	virtualColumn := make([]int, keysLen)
	MemsetInt(virtualColumn, axesLen)

	// calculate left distance
	updateLeftDis(dis[0], virtualColumn, chunks[0].Keys, compactKeys)
	for i := 1; i < axesLen; i++ {
		updateLeftDis(dis[i], dis[i-1], chunks[i].Keys, compactKeys)
	}
	// calculate the nearest distance on both sides
	end := axesLen - 1
	updateRightDis(dis[end], virtualColumn, chunks[end].Keys, compactKeys)
	for i := end - 1; i >= 0; i-- {
		updateRightDis(dis[i], dis[i+1], chunks[i].Keys, compactKeys)
	}

	return distanceHelper{
		Scale: s.GenerateScale(chunks, compactKeys, dis),
	}
}

func (s *distanceStrategy) Split(dst, src chunk, tag splitTag, axesIndex int, helper interface{}) {
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
	scale := helper.(distanceHelper).Scale

	switch tag {
	case splitTo:
		for i, key := range src.Keys[1:] {
			for !equal(dst.Keys[end], key) {
				end++
			}
			value := src.Values[i]
			for ; start < end; start++ {
				dst.Values[start] = uint64(float64(value) * scale[axesIndex][start])
			}
			end++
		}
	case splitAdd:
		for i, key := range src.Keys[1:] {
			for !equal(dst.Keys[end], key) {
				end++
			}
			value := src.Values[i]
			for ; start < end; start++ {
				dst.Values[start] += uint64(float64(value) * scale[axesIndex][start])
			}
			end++
		}
	default:
		panic("unreachable")
	}
}

// multi-threaded calculate scale matrix.
var workerCount = runtime.NumCPU()

type scaleTask struct {
	*sync.WaitGroup
	Dis         []int
	Keys        []string
	CompactKeys []string
	Scale       *[]float64
}

func (s *distanceStrategy) StartWorkers(wg *sync.WaitGroup) {
	wg.Add(len(s.ScaleWorkers))
	for i := range s.ScaleWorkers {
		ch := make(chan *scaleTask)
		s.ScaleWorkers[i] = ch
		go func() {
			s.GenerateScaleColumnWork(ch)
			wg.Done()
		}()
	}
}

func (s *distanceStrategy) StopWorkers() {
	for _, ch := range s.ScaleWorkers {
		ch <- nil
	}
}

func (s *distanceStrategy) GenerateScale(chunks []chunk, compactKeys []string, dis [][]int) [][]float64 {
	var wg sync.WaitGroup
	axesLen := len(chunks)
	scale := make([][]float64, axesLen)
	wg.Add(axesLen)
	for i := 0; i < axesLen; i++ {
		s.ScaleWorkers[i%workerCount] <- &scaleTask{
			WaitGroup:   &wg,
			Dis:         dis[i],
			Keys:        chunks[i].Keys,
			CompactKeys: compactKeys,
			Scale:       &scale[i],
		}
	}
	wg.Wait()
	return scale
}

func (s *distanceStrategy) GenerateScaleColumnWork(ch chan *scaleTask) {
	var maxDis int
	// Each split interval needs to be sorted after copying to tempDis
	var tempDis []int
	// Used as a mapping from distance to scale
	tempMapCap := 256
	tempMap := make([]float64, tempMapCap)

	for task := range ch {
		if task == nil {
			break
		}

		dis := task.Dis
		keys := task.Keys
		compactKeys := task.CompactKeys

		// The maximum distance between the StartKey and EndKey of a bucket
		// is considered the bucket distance.
		dis, maxDis = toBucketDis(dis)
		scale := make([]float64, len(dis))
		*task.Scale = scale

		// When it is not enough to accommodate maxDis, expand the capacity.
		for tempMapCap <= maxDis {
			tempMapCap *= 2
			tempMap = make([]float64, tempMapCap)
		}

		// generate scale column
		start := 0
		for startKey := keys[0]; !equal(compactKeys[start], startKey); {
			start++
		}
		end := start + 1

		for _, key := range keys[1:] {
			for !equal(compactKeys[end], key) {
				end++
			}

			if start+1 == end {
				// Optimize calculation when splitting into 1
				scale[start] = 1.0
				start++
			} else {
				// Copy tempDis and calculate the top n levels
				tempDis = append(tempDis[:0], dis[start:end]...)
				tempLen := len(tempDis)
				sort.Ints(tempDis)
				// Calculate distribution factors and sums based on distance ordering
				level := 0
				tempMap[tempDis[0]] = 1.0
				tempValue := 1.0
				tempSum := 1.0
				for i := 1; i < tempLen; i++ {
					d := tempDis[i]
					if d != tempDis[i-1] {
						level++
						if level >= s.SplitLevel || i >= s.SplitCount {
							tempMap[d] = 0
						} else {
							// tempValue = math.Pow(s.SplitRatio, float64(level))
							tempValue = s.SplitRatioPow[level]
							tempMap[d] = tempValue
						}
					}
					tempSum += tempValue
				}
				// Calculate scale
				for ; start < end; start++ {
					scale[start] = tempMap[dis[start]] / tempSum
				}
			}
			end++
		}
		// task finish
		task.WaitGroup.Done()
	}
}

func updateLeftDis(dis, leftDis []int, keys, compactKeys []string) {
	CheckPartOf(compactKeys, keys)
	j := 0
	keysLen := len(keys)
	for i := range dis {
		if j < keysLen && equal(compactKeys[i], keys[j]) {
			dis[i] = 0
			j++
		} else {
			dis[i] = leftDis[i] + 1
		}
	}
}

func updateRightDis(dis, rightDis []int, keys, compactKeys []string) {
	j := 0
	keysLen := len(keys)
	for i := range dis {
		if j < keysLen && equal(compactKeys[i], keys[j]) {
			dis[i] = 0
			j++
		} else {
			dis[i] = Min(dis[i], rightDis[i]+1)
		}
	}
}

func toBucketDis(dis []int) ([]int, int) {
	maxDis := 0
	for i := len(dis) - 1; i > 0; i-- {
		dis[i] = Max(dis[i], dis[i-1])
		maxDis = Max(maxDis, dis[i])
	}
	return dis[1:], maxDis
}
