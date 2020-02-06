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
	"sync"
	"time"
)

// Plane stores consecutive axes. Each axis has StartTime, EndTime. The EndTime of each axis is the StartTime of its
// next axis. Therefore satisfies:
// len(Times) == len(Axes) + 1
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
func (plane *Plane) Compact(strategy Strategy) Axis {
	chunks := make([]chunk, len(plane.Axes))
	for i, axis := range plane.Axes {
		chunks[i] = createChunk(axis.Keys, axis.ValuesList[0])
	}
	compactChunk, helper := compact(strategy, chunks)
	valuesListLen := len(plane.Axes[0].ValuesList)
	valuesList := make([][]uint64, valuesListLen)
	valuesList[0] = compactChunk.Values
	for j := 1; j < valuesListLen; j++ {
		compactChunk.SetZeroValues()
		for i, axis := range plane.Axes {
			chunks[i].SetValues(axis.ValuesList[j])
			strategy.Split(compactChunk, chunks[i], splitAdd, i, helper)
		}
		valuesList[j] = compactChunk.Values
	}
	return CreateAxis(compactChunk.Keys, valuesList)
}

// Pixel pixelates Plane into a matrix with a number of rows close to the target.
func (plane *Plane) Pixel(strategy Strategy, target int, displayTags []string) Matrix {
	valuesListLen := len(plane.Axes[0].ValuesList)
	if valuesListLen != len(displayTags) {
		panic("the length of displayTags and valuesList should be equal")
	}
	axesLen := len(plane.Axes)
	chunks := make([]chunk, axesLen)
	for i, axis := range plane.Axes {
		chunks[i] = createChunk(axis.Keys, axis.ValuesList[0])
	}
	compactChunk, helper := compact(strategy, chunks)
	baseKeys := compactChunk.Divide(strategy, target).Keys
	matrix := CreateMatrix(strategy, plane.Times, baseKeys, valuesListLen)

	var wg sync.WaitGroup
	var mutex sync.Mutex
	generateFunc := func(j int) {
		data := make([][]uint64, axesLen)
		goCompactChunk := createZeroChunk(compactChunk.Keys)
		for i, axis := range plane.Axes {
			goCompactChunk.Clear()
			strategy.Split(goCompactChunk, createChunk(chunks[i].Keys, axis.ValuesList[j]), splitTo, i, helper)
			data[i] = goCompactChunk.Reduce(baseKeys).Values
		}
		mutex.Lock()
		matrix.DataMap[displayTags[j]] = data
		mutex.Unlock()
		wg.Done()
	}

	wg.Add(valuesListLen)
	for j := 0; j < valuesListLen; j++ {
		go generateFunc(j)
	}
	wg.Wait()

	return matrix
}

func compact(strategy Strategy, chunks []chunk) (compactChunk chunk, helper interface{}) {
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

	helper = strategy.GenerateHelper(chunks, compactChunk.Keys)
	for i, c := range chunks {
		strategy.Split(compactChunk, c, splitAdd, i, helper)
	}
	return
}
