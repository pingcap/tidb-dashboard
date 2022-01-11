// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"database/sql"
	"database/sql/driver"
	"time"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/profutil"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/svc/model"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/util/jsonserde"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

type ProfKindList []profutil.ProfKind

var (
	_ sql.Scanner   = (*ProfKindList)(nil)
	_ driver.Valuer = ProfKindList{}
)

func (r *ProfKindList) Scan(src interface{}) error {
	return jsonserde.Default.Unmarshal([]byte(src.(string)), r)
}

func (r ProfKindList) Value() (driver.Value, error) {
	val, err := jsonserde.Default.Marshal(r)
	return string(val), err
}

type ProfileModel struct {
	ID            uint                     `gorm:"primary_key"`
	BundleID      uint                     `gorm:"index"`
	State         model.ProfileState       `gorm:"index"`
	Target        topo.ComponentDescriptor `gorm:"type:TEXT"`
	Kind          profutil.ProfKind
	Error         string `gorm:"type:TEXT"`
	StartAt       int64
	EstimateEndAt int64
	RawData       []byte `json:"-" gorm:"type:BLOB"`
	RawDataType   profutil.ProfDataType
}

func (ProfileModel) TableName() string {
	return "profiling_v2_profiles"
}

func (m *ProfileModel) ToStandardModel(now time.Time) model.Profile {
	var progress float32
	if m.State == model.ProfileStateError || m.State == model.ProfileStateSkipped || m.State == model.ProfileStateSucceeded {
		progress = 1
	} else {
		plannedSecs := m.EstimateEndAt - m.StartAt
		if plannedSecs <= 0 {
			plannedSecs = 0
		}
		elapsedSecs := now.Unix() - m.StartAt
		if elapsedSecs <= 0 {
			elapsedSecs = 0
		}
		if elapsedSecs >= plannedSecs {
			elapsedSecs = plannedSecs
		}
		if plannedSecs == 0 {
			progress = 1
		} else {
			progress = float32(elapsedSecs) / float32(plannedSecs)
		}
	}
	return model.Profile{
		ProfileID: m.ID,
		State:     m.State,
		Target:    m.Target,
		Kind:      m.Kind,
		Error:     m.Error,
		StartAt:   time.Unix(m.StartAt, 0),
		Progress:  progress,
		DataType:  m.RawDataType,
	}
}

type BundleModel struct {
	ID           uint              `gorm:"primary_key"`
	State        model.BundleState `gorm:"index"`
	DurationSec  uint
	TargetsCount topo.ComponentStats `gorm:"type:TEXT"`
	StartAt      int64
	Kinds        ProfKindList `gorm:"type:TEXT"`
}

func (BundleModel) TableName() string {
	return "profiling_v2_bundles"
}

func (m *BundleModel) ToStandardModel() model.Bundle {
	return model.Bundle{
		BundleID:     m.ID,
		State:        m.State,
		DurationSec:  m.DurationSec,
		TargetsCount: m.TargetsCount,
		StartAt:      time.Unix(m.StartAt, 0),
		Kinds:        m.Kinds,
	}
}

func autoMigrate(db *dbstore.DB) error {
	return db.AutoMigrate(&ProfileModel{}, &BundleModel{})
}
