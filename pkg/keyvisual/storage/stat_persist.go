// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package storage

import (
	"time"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/matrix"
)

func (s *layerStat) InsertLastAxisToDb(axis matrix.Axis, endTime time.Time) error {
	log.Debug("Insert Axis", zap.Uint8("layer num", s.LayerNum), zap.Time("time", endTime))
	axisModel, err := NewAxisModel(s.LayerNum, endTime, axis)
	if err != nil {
		return err
	}
	return axisModel.Insert(s.Db)
}

func (s *layerStat) DeleteFirstAxisFromDb() error {
	log.Debug("Delete Axis", zap.Uint8("layer num", s.LayerNum), zap.Time("time", s.StartTime))
	axisModel, err := NewAxisModel(s.LayerNum, s.StartTime, matrix.Axis{})
	if err != nil {
		return err
	}
	return axisModel.Delete(s.Db)
}

// Restore data from db the first time service starts.
func (s *Stat) Restore() error {
	s.keyMap.Lock()
	defer s.keyMap.Unlock()
	s.mutex.Lock()
	defer s.mutex.Unlock()

	// insert start `AxisModel` for each layer
	createStartAxisModels := func() error {
		log.Debug("Create start axisModel for each layer")
		for i, layer := range s.layers {
			startAxisModel, err := NewAxisModel(uint8(i), layer.StartTime, matrix.Axis{})
			if err != nil {
				return err
			}
			if err := startAxisModel.Insert(s.db); err != nil {
				return err
			}
		}
		return nil
	}

	// table `AxisModel` preprocess
	isExist, err := CreateTableAxisModelIfNotExists(s.db)
	if err != nil {
		return err
	}
	if !isExist {
		return createStartAxisModels()
	}

	// load data from db
	for layerNum := uint8(0); ; layerNum++ {
		axisModels, err := FindAxisModelsOrderByTime(s.db, layerNum)
		if err != nil {
			return err
		}
		if len(axisModels) == 0 {
			break
		}
		if layerNum >= uint8(len(s.layers)) {
			log.Warn("Layer num is too large. Ignore and delete the redundant axisModels", zap.Uint8("layer num", layerNum), zap.Int("layers len", len(s.layers)))
			_ = DeleteAxisModelsByLayerNum(s.db, layerNum)
			continue
		}

		if len(axisModels) > 1 {
			s.layers[layerNum].Empty = false
		} else if layerNum == 0 {
			// no valid data was stored，clear
			log.Debug("Clear table AxisModel")
			if err := ClearTableAxisModel(s.db); err != nil {
				return err
			}
			return createStartAxisModels()
		}
		log.Debug("Load axisModels", zap.Uint8("layer num", layerNum), zap.Int("len", len(axisModels)-1))

		// the first axisModel is only used to save starttime
		s.layers[layerNum].StartTime = axisModels[0].Time
		s.layers[layerNum].Head = 0
		n := len(axisModels) - 1
		if n > s.layers[layerNum].Len {
			log.Warn("The number of axisModel is longer than layer's len", zap.Int("number", n), zap.Int("layer len", s.layers[layerNum].Len), zap.Uint8("layer num", layerNum))
			for _, p := range axisModels[s.layers[layerNum].Len+1:] {
				_ = p.Delete(s.db)
			}
			n = s.layers[layerNum].Len
		}
		s.layers[layerNum].EndTime = axisModels[n].Time
		s.layers[layerNum].Tail = (s.layers[layerNum].Head + n) % s.layers[layerNum].Len
		for i, axisModel := range axisModels[1 : n+1] {
			s.layers[layerNum].RingTimes[i] = axisModel.Time
			axis, err := axisModel.UnmarshalAxis()
			if err != nil {
				return err
			}
			s.keyMap.SaveKeys(axis.Keys)
			s.layers[layerNum].RingAxes[i] = axis
		}
	}
	return nil
}
