package storage

import (
	"bytes"
	"encoding/gob"
	"time"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/matrix"
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

func NewPlane(layerNum uint8, time time.Time, axis matrix.Axis) (*AxisModel, error) {
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
	var buf = bytes.NewBuffer(a.Axis)
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

// If the table `Plane` exists, return true, nil
// or create table `Plane`
func CreateTablePlaneIfNotExists(db *dbstore.DB) (bool, error) {
	if db.HasTable(&AxisModel{}) {
		return true, nil
	}
	return false, db.CreateTable(&AxisModel{}).Error
}

func ClearTablePlane(db *dbstore.DB) error {
	return db.Delete(&AxisModel{}).Error
}

func FindPlanesOrderByTime(db *dbstore.DB, layerNum uint8) ([]*AxisModel, error) {
	var planes []*AxisModel
	err := db.
		Where("layer_num = ?", layerNum).
		Order("time").
		Find(&planes).
		Error
	return planes, err
}

func DeletePlanesByLayerNum(db *dbstore.DB, layerNum uint8) error {
	return db.
		Where("layer_num = ?", layerNum).
		Delete(&AxisModel{}).
		Error
}
