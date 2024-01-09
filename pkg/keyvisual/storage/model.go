// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package storage

import (
	"bytes"
	"encoding/gob"
	"time"

	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/matrix"
)

const tableAxisModelName = "keyviz_axis"

type AxisModel struct {
	LayerNum uint8     `gorm:"unique_index:index_layer_time"`
	Time     time.Time `gorm:"unique_index:index_layer_time"`
	Axis     []byte
}

func (AxisModel) TableName() string {
	return tableAxisModelName
}

func NewAxisModel(layerNum uint8, time time.Time, axis matrix.Axis) (*AxisModel, error) {
	var buf bytes.Buffer
	enc := gob.NewEncoder(&buf)
	err := enc.Encode(axis)
	if err != nil {
		return nil, err
	}
	return &AxisModel{
		layerNum,
		time,
		buf.Bytes(),
	}, nil
}

func (a *AxisModel) UnmarshalAxis() (matrix.Axis, error) {
	buf := bytes.NewBuffer(a.Axis)
	dec := gob.NewDecoder(buf)
	var axis matrix.Axis
	err := dec.Decode(&axis)
	return axis, err
}

func (a *AxisModel) Insert(db *dbstore.DB) error {
	return db.Create(a).Error
}

func (a *AxisModel) Delete(db *dbstore.DB) error {
	return db.
		Where("layer_num = ? AND time = ?", a.LayerNum, a.Time).
		Delete(&AxisModel{}).
		Error
}

// If the table `AxisModel` exists, return true, nil
// or create table `AxisModel`.
func CreateTableAxisModelIfNotExists(db *dbstore.DB) (bool, error) {
	if db.Migrator().HasTable(&AxisModel{}) {
		return true, nil
	}
	return false, db.Migrator().CreateTable(&AxisModel{})
}

func ClearTableAxisModel(db *dbstore.DB) error {
	return db.Session(&gorm.Session{AllowGlobalUpdate: true}).
		Delete(&AxisModel{}).
		Error
}

func FindAxisModelsOrderByTime(db *dbstore.DB, layerNum uint8) ([]*AxisModel, error) {
	var axisModels []*AxisModel
	err := db.
		Where("layer_num = ?", layerNum).
		Order("time").
		Find(&axisModels).
		Error
	return axisModels, err
}

func DeleteAxisModelsByLayerNum(db *dbstore.DB, layerNum uint8) error {
	return db.
		Where("layer_num = ?", layerNum).
		Delete(&AxisModel{}).
		Error
}
