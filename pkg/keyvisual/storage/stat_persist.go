package storage

import (
	"time"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/matrix"
)

func (s *layerStat) InsertLastAxisToDb(axis matrix.Axis, endTime time.Time) error {
	log.Debug("Insert Axis", zap.Uint8("layer num", s.LayerNum), zap.Time("time", endTime))
	plane, err := NewPlane(s.LayerNum, endTime, axis)
	if err != nil {
		return err
	}
	return plane.Insert(s.Db)
}

func (s *layerStat) DeleteFirstAxisFromDb() error {
	log.Debug("Delete Axis", zap.Uint8("layer num", s.LayerNum), zap.Time("time", s.StartTime))
	plane, err := NewPlane(s.LayerNum, s.StartTime, matrix.Axis{})
	if err != nil {
		return err
	}
	return plane.Delete(s.Db)
}

// Restore data from db the first time service starts
func (s *Stat) Restore() error {
	s.keyMap.Lock()
	defer s.keyMap.Unlock()
	s.mutex.Lock()
	defer s.mutex.Unlock()

	// insert start `Plane` for each layer
	createStartPlanes := func() error {
		log.Debug("Create start plane for each layer")
		for i, layer := range s.layers {
			startPlane, err := NewPlane(uint8(i), layer.StartTime, matrix.Axis{})
			if err != nil {
				return err
			}
			if err := startPlane.Insert(s.db); err != nil {
				return err
			}
		}
		return nil
	}

	// table planes preprocess
	isExist, err := CreateTablePlaneIfNotExists(s.db)
	if err != nil {
		return err
	}
	if !isExist {
		return createStartPlanes()
	}

	// load data from db
	for layerNum := uint8(0); ; layerNum++ {
		planes, err := FindPlaneOrderByTime(s.db, layerNum)
		if err != nil || len(planes) == 0 {
			break
		}
		if len(planes) > 1 {
			s.layers[layerNum].Empty = false
		} else if layerNum == 0 {
			// no valid data was stored，clear
			log.Debug("Clear table plane")
			if err := ClearTablePlane(s.db); err != nil {
				return err
			}
			return createStartPlanes()
		}
		log.Debug("Load planes", zap.Uint8("layer num", layerNum), zap.Int("len", len(planes)-1))

		if layerNum >= uint8(len(s.layers)) {
			log.Warn("Layer num is too large. Ignore and delete the redundant planes", zap.Uint8("layer num", layerNum), zap.Int("layers len", len(s.layers)))
			_ = DeletePlanesByLayerNum(s.db, layerNum)
			continue
		}
		// the first plane is only used to save starttime
		s.layers[layerNum].StartTime = planes[0].Time
		s.layers[layerNum].Head = 0
		n := len(planes) - 1
		if n > s.layers[layerNum].Len {
			log.Warn("The number of plane is longer than layer's len", zap.Int("number", n), zap.Int("layer len", s.layers[layerNum].Len), zap.Uint8("layer num", layerNum))
			for _, p := range planes[s.layers[layerNum].Len+1:] {
				_ = p.Delete(s.db)
			}
			n = s.layers[layerNum].Len
		}
		s.layers[layerNum].EndTime = planes[n].Time
		s.layers[layerNum].Tail = (s.layers[layerNum].Head + n) % s.layers[layerNum].Len
		for i, plane := range planes[1 : n+1] {
			s.layers[layerNum].RingTimes[i] = plane.Time
			axis, err := plane.UnmarshalAxis()
			if err != nil {
				return err
			}
			s.keyMap.SaveKeys(axis.Keys)
			s.layers[layerNum].RingAxes[i] = axis
		}
	}
	return nil
}