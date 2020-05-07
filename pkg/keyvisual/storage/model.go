package storage

import (
	"bytes"
	"encoding/gob"
	"time"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/matrix"
)

const tablePlaneName = "planes"

type Plane struct {
	LayerNum uint8 `gorm:"column:layer_num"`
	Time     time.Time
	Axis     []byte
}

func (Plane) TableName() string {
	return tablePlaneName
}

func NewPlane(layerNum uint8, time time.Time, axis matrix.Axis) (*Plane, error) {
	var buf bytes.Buffer
	enc := gob.NewEncoder(&buf)
	err := enc.Encode(axis)
	if err != nil {
		return nil, err
	}
	return &Plane{
		layerNum,
		time,
		buf.Bytes(),
	}, nil
}

func (p *Plane) UnmarshalAxis() (matrix.Axis, error) {
	var buf = bytes.NewBuffer(p.Axis)
	dec := gob.NewDecoder(buf)
	var axis matrix.Axis
	err := dec.Decode(&axis)
	return axis, err
}

func (p *Plane) Insert(db *dbstore.DB) error {
	return db.Create(p).Error
}

func (p *Plane) Delete(db *dbstore.DB) error {
	return db.
		Where("layer_num = ? AND time = ?", p.LayerNum, p.Time).
		Delete(&Plane{}).
		Error
}

// If the table `Plane` exists, return true, nil
// or create table `Plane`
func CreateTablePlaneIfNotExists(db *dbstore.DB) (bool, error) {
	if db.HasTable(&Plane{}) {
		return true, nil
	}
	return false, db.CreateTable(&Plane{}).Error
}

func ClearTablePlane(db *dbstore.DB) error {
	return db.Table(tablePlaneName).Delete(&Plane{}).Error
}

func FindPlanesOrderByTime(db *dbstore.DB, layerNum uint8) ([]*Plane, error) {
	var planes []*Plane
	err := db.
		Where("layer_num = ?", layerNum).
		Order("Time").
		Find(&planes).
		Error
	return planes, err
}

func DeletePlanesByLayerNum(db *dbstore.DB, layerNum uint8) error {
	return db.
		Where("layer_num = ?", layerNum).
		Delete(&Plane{}).
		Error
}
