// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Package storage stores the input axes in order, and can get a Plane by time interval.
package storage

import (
	"context"
	"sort"
	"sync"
	"time"

	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/decorator"
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/matrix"
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/region"
)

// LayerConfig is the configuration of layerStat.
type LayerConfig struct {
	Len   int
	Ratio int
}

// layerStat is a layer in Stat. It uses a circular queue structure and can store up to Len Axes. Whenever the data is
// full, the Ratio Axes will be compacted into an Axis and added to the next layer.
type layerStat struct {
	StartTime time.Time
	EndTime   time.Time
	RingAxes  []matrix.Axis
	RingTimes []time.Time

	LayerNum uint8
	Head     int
	Tail     int
	Empty    bool
	Len      int

	Db *dbstore.DB
	// Hierarchical mechanism
	SplitStrategy matrix.SplitStrategy
	Ratio         int
	Next          *layerStat
}

func newLayerStat(
	layerNum uint8,
	conf LayerConfig,
	splitStrategy matrix.SplitStrategy,
	startTime time.Time,
	db *dbstore.DB,
) *layerStat {
	return &layerStat{
		StartTime:     startTime,
		EndTime:       startTime,
		RingAxes:      make([]matrix.Axis, conf.Len),
		RingTimes:     make([]time.Time, conf.Len),
		LayerNum:      layerNum,
		Head:          0,
		Tail:          0,
		Empty:         true,
		Len:           conf.Len,
		Db:            db,
		SplitStrategy: splitStrategy,
		Ratio:         conf.Ratio,
		Next:          nil,
	}
}

// Reduce merges ratio axes and append to next layerStat.
func (s *layerStat) Reduce(labeler decorator.Labeler) {
	if s.Ratio == 0 || s.Next == nil {
		_ = s.DeleteFirstAxisFromDb()

		s.StartTime = s.RingTimes[s.Head]
		s.RingAxes[s.Head] = matrix.Axis{}
		s.Head = (s.Head + 1) % s.Len
		return
	}

	times := make([]time.Time, 0, s.Ratio+1)
	times = append(times, s.StartTime)
	axes := make([]matrix.Axis, 0, s.Ratio)

	for i := 0; i < s.Ratio; i++ {
		_ = s.DeleteFirstAxisFromDb()

		s.StartTime = s.RingTimes[s.Head]
		times = append(times, s.StartTime)
		axes = append(axes, s.RingAxes[s.Head])
		s.RingAxes[s.Head] = matrix.Axis{}
		s.Head = (s.Head + 1) % s.Len
	}

	plane := matrix.CreatePlane(times, axes)
	newAxis := plane.Compact(s.SplitStrategy)
	newAxis = IntoResponseAxis(newAxis, region.Integration)
	newAxis = IntoStorageAxis(newAxis, labeler)
	newAxis.Shrink(uint64(s.Ratio))
	s.Next.Append(newAxis, s.StartTime, labeler)
}

// Append appends a key axis to layerStat.
func (s *layerStat) Append(axis matrix.Axis, endTime time.Time, labeler decorator.Labeler) {
	if s.Head == s.Tail && !s.Empty {
		s.Reduce(labeler)
	}

	_ = s.InsertLastAxisToDb(axis, endTime)

	s.RingAxes[s.Tail] = axis
	s.RingTimes[s.Tail] = endTime
	s.Empty = false
	s.EndTime = endTime
	s.Tail = (s.Tail + 1) % s.Len
}

// Range gets the specify plane in the time range.
func (s *layerStat) Range(startTime, endTime time.Time) (times []time.Time, axes []matrix.Axis) {
	if s.Next != nil {
		times, axes = s.Next.Range(startTime, endTime)
	}

	if s.Empty || (!(startTime.Before(s.EndTime) && endTime.After(s.StartTime))) {
		return times, axes
	}

	size := s.Tail - s.Head
	if size <= 0 {
		size += s.Len
	}

	start := sort.Search(size, func(i int) bool {
		return s.RingTimes[(s.Head+i)%s.Len].After(startTime)
	})
	end := sort.Search(size, func(i int) bool {
		return !s.RingTimes[(s.Head+i)%s.Len].Before(endTime)
	})
	if end != size {
		end++
	}

	n := end - start
	start = (s.Head + start) % s.Len

	// add StartTime
	if len(times) == 0 {
		if start == s.Head {
			times = append(times, s.StartTime)
		} else {
			times = append(times, s.RingTimes[(start-1+s.Len)%s.Len])
		}
	}

	if start+n <= s.Len {
		times = append(times, s.RingTimes[start:start+n]...)
		axes = append(axes, s.RingAxes[start:start+n]...)
	} else {
		times = append(times, s.RingTimes[start:s.Len]...)
		times = append(times, s.RingTimes[0:start+n-s.Len]...)
		axes = append(axes, s.RingAxes[start:s.Len]...)
		axes = append(axes, s.RingAxes[0:start+n-s.Len]...)
	}

	return times, axes
}

// StatConfig is the configuration of Stat.
type StatConfig struct {
	LayersConfig []LayerConfig
}

// Stat is composed of multiple layerStats.
type Stat struct {
	mutex  sync.RWMutex
	layers []*layerStat

	keyMap   matrix.KeyMap
	strategy *matrix.Strategy

	db *dbstore.DB
}

// NewStat generates a Stat based on the configuration.
func NewStat(
	lc fx.Lifecycle,
	wg *sync.WaitGroup,
	db *dbstore.DB,
	cfg StatConfig,
	strategy *matrix.Strategy,
	startTime time.Time,
) *Stat {
	layers := make([]*layerStat, len(cfg.LayersConfig))
	for i, c := range cfg.LayersConfig {
		layers[i] = newLayerStat(uint8(i), c, strategy, startTime, db)
		if i > 0 {
			layers[i-1].Next = layers[i]
		}
	}
	s := &Stat{
		layers:   layers,
		strategy: strategy,
		db:       db,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			if err := s.Restore(); err != nil {
				return err
			}
			wg.Add(1)
			go func() {
				defer wg.Done()
				s.rebuildRegularly(ctx)
			}()
			return nil
		},
	})

	return s
}

func (s *Stat) rebuildKeyMap() {
	s.keyMap.Lock()
	defer s.keyMap.Unlock()
	s.mutex.Lock()
	defer s.mutex.Unlock()

	s.keyMap.Map = sync.Map{}

	for _, layer := range s.layers {
		for _, axis := range layer.RingAxes {
			if len(axis.Keys) > 0 {
				s.keyMap.SaveKeys(axis.Keys)
			}
		}
	}
}

func (s *Stat) rebuildRegularly(ctx context.Context) {
	ticker := time.NewTicker(time.Hour * 24)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.rebuildKeyMap()
		}
	}
}

// Append adds the latest full statistics.
func (s *Stat) Append(regions region.RegionsInfo, endTime time.Time) {
	if regions.Len() == 0 {
		return
	}
	labeler := s.strategy.NewLabeler()
	axis := CreateStorageAxis(regions, labeler)

	s.keyMap.RLock()
	defer s.keyMap.RUnlock()
	s.keyMap.SaveKeys(axis.Keys)

	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.layers[0].Append(axis, endTime, labeler)
}

func (s *Stat) rangeRoot(startTime, endTime time.Time) ([]time.Time, []matrix.Axis) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.layers[0].Range(startTime, endTime)
}

// Range returns a sub Plane with specified range.
func (s *Stat) Range(startTime, endTime time.Time, startKey, endKey string, baseTag region.StatTag) matrix.Plane {
	s.keyMap.RLock()
	defer s.keyMap.RUnlock()
	s.keyMap.SaveKey(&startKey)
	s.keyMap.SaveKey(&endKey)

	times, axes := s.rangeRoot(startTime, endTime)

	if len(times) <= 1 {
		return matrix.CreateEmptyPlane(startTime, endTime, startKey, endKey, len(region.ResponseTags))
	}

	for i, axis := range axes {
		axis = axis.Range(startKey, endKey)
		axis = IntoResponseAxis(axis, baseTag)
		axes[i] = axis
	}
	return matrix.CreatePlane(times, axes)
}
