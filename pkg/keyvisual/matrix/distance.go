// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package matrix

import (
	"context"
	"math"
	"runtime"
	"sort"
	"sync"

	"go.uber.org/fx"
)

// TODO:
// * Multiplexing data between requests
// * Limit memory usage

func DistanceSplitStrategy(lc fx.Lifecycle, wg *sync.WaitGroup, ratio float64, level int, count int) SplitStrategy {
	pow := make([]float64, level)
	for i := range pow {
		pow[i] = math.Pow(ratio, float64(i))
	}
	s := &distanceSplitStrategy{
		SplitRatio:    ratio,
		SplitLevel:    level,
		SplitCount:    count,
		SplitRatioPow: pow,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			s.StartWorkers(ctx, wg)
			return nil
		},
		OnStop: func(context.Context) error {
			s.StopWorkers()
			return nil
		},
	})

	return s
}

type distanceSplitStrategy struct {
	SplitRatio float64
	SplitLevel int
	SplitCount int

	SplitRatioPow []float64

	ScaleWorkerCh chan *scaleTask
}

type distanceSplitter struct {
	Scale [][]float64
}

func (s *distanceSplitStrategy) NewSplitter(chunks []chunk, compactKeys []string) Splitter {
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

	return &distanceSplitter{
		Scale: s.GenerateScale(chunks, compactKeys, dis),
	}
}

func (e *distanceSplitter) Split(dst, src chunk, tag splitTag, axesIndex int) {
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
			value := src.Values[i]
			for ; start < end; start++ {
				dst.Values[start] = uint64(float64(value) * e.Scale[axesIndex][start])
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
				dst.Values[start] += uint64(float64(value) * e.Scale[axesIndex][start])
			}
			end++
		}
	default:
		panic("unreachable")
	}
}

// multi-threaded calculate scale matrix.
var workerCount int

func init() {
	workerCount = runtime.NumCPU()
	if workerCount > 20 {
		workerCount = 20
	}
}

type scaleTask struct {
	*sync.WaitGroup
	Dis         []int
	Keys        []string
	CompactKeys []string
	Scale       *[]float64
}

func (s *distanceSplitStrategy) StartWorkers(ctx context.Context, wg *sync.WaitGroup) {
	s.ScaleWorkerCh = make(chan *scaleTask, workerCount*100)
	wg.Add(workerCount)
	for i := 0; i < workerCount; i++ {
		go func() {
			defer wg.Done()
			s.GenerateScaleColumnWork(ctx, s.ScaleWorkerCh)
		}()
	}
}

func (s *distanceSplitStrategy) StopWorkers() {
	close(s.ScaleWorkerCh)
}

func (s *distanceSplitStrategy) GenerateScale(chunks []chunk, compactKeys []string, dis [][]int) [][]float64 {
	var wg sync.WaitGroup
	axesLen := len(chunks)
	scale := make([][]float64, axesLen)
	wg.Add(axesLen)
	for i := 0; i < axesLen; i++ {
		s.ScaleWorkerCh <- &scaleTask{
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

func (s *distanceSplitStrategy) GenerateScaleColumnWork(ctx context.Context, ch <-chan *scaleTask) {
	var maxDis int
	// Each split interval needs to be sorted after copying to tempDis
	var tempDis []int
	// Used as a mapping from distance to scale
	tempMapCap := 256
	tempMap := make([]float64, tempMapCap)
	for {
		select {
		case <-ctx.Done():
			return
		case task, ok := <-ch:
			if !ok {
				return
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
