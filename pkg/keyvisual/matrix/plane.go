// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package matrix

import (
	"sync"
	"time"
)

// Plane stores consecutive axes. Each axis has StartTime, EndTime. The EndTime of each axis is the StartTime of its
// next axis. Therefore satisfies:
// len(Times) == len(Axes) + 1.
type Plane struct {
	Times []time.Time
	Axes  []Axis
}

// CreatePlane checks the given parameters and uses them to build the Plane.
func CreatePlane(times []time.Time, axes []Axis) Plane {
	if len(times) <= 1 {
		panic("Times length must be greater than 1")
	}
	return Plane{
		Times: times,
		Axes:  axes,
	}
}

// CreateEmptyPlane constructs a minimal empty Plane with the given parameters.
func CreateEmptyPlane(startTime, endTime time.Time, startKey, endKey string, valuesListLen int) Plane {
	return CreatePlane([]time.Time{startTime, endTime}, []Axis{CreateEmptyAxis(startKey, endKey, valuesListLen)})
}

// Compact compacts Plane into an axis.
func (plane *Plane) Compact(strategy SplitStrategy) Axis {
	chunks := make([]chunk, len(plane.Axes))
	for i, axis := range plane.Axes {
		chunks[i] = createChunk(axis.Keys, axis.ValuesList[0])
	}
	compactChunk, splitter := compact(strategy, chunks)
	valuesListLen := len(plane.Axes[0].ValuesList)
	valuesList := make([][]uint64, valuesListLen)
	valuesList[0] = compactChunk.Values
	for j := 1; j < valuesListLen; j++ {
		compactChunk.SetZeroValues()
		for i, axis := range plane.Axes {
			chunks[i].SetValues(axis.ValuesList[j])
			splitter.Split(compactChunk, chunks[i], splitAdd, i)
		}
		valuesList[j] = compactChunk.Values
	}
	return CreateAxis(compactChunk.Keys, valuesList)
}

// Pixel pixelates Plane into a matrix with a number of rows close to the target.
func (plane *Plane) Pixel(strategy *Strategy, target int, displayTags []string) Matrix {
	valuesListLen := len(plane.Axes[0].ValuesList)
	if valuesListLen != len(displayTags) {
		panic("the length of displayTags and valuesList should be equal")
	}
	axesLen := len(plane.Axes)
	chunks := make([]chunk, axesLen)
	for i, axis := range plane.Axes {
		chunks[i] = createChunk(axis.Keys, axis.ValuesList[0])
	}
	compactChunk, splitter := compact(strategy, chunks)
	labeler := strategy.NewLabeler()
	baseKeys := compactChunk.Divide(labeler, target, NotMergeLogicalRange).Keys
	matrix := CreateMatrix(labeler, plane.Times, baseKeys, valuesListLen)

	var wg sync.WaitGroup
	var mutex sync.Mutex
	generateFunc := func(j int) {
		defer wg.Done()
		data := make([][]uint64, axesLen)
		goCompactChunk := createZeroChunk(compactChunk.Keys)
		for i, axis := range plane.Axes {
			goCompactChunk.Clear()
			splitter.Split(goCompactChunk, createChunk(chunks[i].Keys, axis.ValuesList[j]), splitTo, i)
			data[i] = goCompactChunk.Reduce(baseKeys).Values
		}
		mutex.Lock()
		defer mutex.Unlock()
		matrix.DataMap[displayTags[j]] = data
	}

	wg.Add(valuesListLen)
	for j := 0; j < valuesListLen; j++ {
		go generateFunc(j)
	}
	wg.Wait()

	return matrix
}

func compact(strategy SplitStrategy, chunks []chunk) (compactChunk chunk, splitter Splitter) {
	// get compact chunk keys
	keySet := make(map[string]struct{})
	unlimitedEnd := false
	for _, c := range chunks {
		end := len(c.Keys) - 1
		endKey := c.Keys[end]
		if endKey == "" {
			unlimitedEnd = true
		} else {
			keySet[endKey] = struct{}{}
		}
		for _, key := range c.Keys[:end] {
			keySet[key] = struct{}{}
		}
	}

	var compactKeys []string
	if unlimitedEnd {
		compactKeys = MakeKeysWithUnlimitedEnd(keySet)
	} else {
		compactKeys = MakeKeys(keySet)
	}
	compactChunk = createZeroChunk(compactKeys)

	splitter = strategy.NewSplitter(chunks, compactChunk.Keys)
	for i, c := range chunks {
		splitter.Split(compactChunk, c, splitAdd, i)
	}
	return
}
