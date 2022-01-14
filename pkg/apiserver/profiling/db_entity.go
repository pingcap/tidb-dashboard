// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"database/sql"
	"database/sql/driver"
	"time"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/profutil"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/view"
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

type ProfileEntity struct {
	ID            uint                `gorm:"primary_key"`
	BundleID      uint                `gorm:"index"`
	State         view.ProfileState   `gorm:"index"`
	Target        topo.CompDescriptor `gorm:"type:TEXT"`
	Kind          profutil.ProfKind
	Error         string `gorm:"type:TEXT"`
	StartAt       int64
	EstimateEndAt int64
	RawData       []byte `json:"-" gorm:"type:BLOB"`
	RawDataType   profutil.ProfDataType
}

func (ProfileEntity) TableName() string {
	return "profiling_v2_profiles"
}

func (m *ProfileEntity) ToViewModel(now time.Time) view.Profile {
	var progress float32
	if m.State == view.ProfileStateError || m.State == view.ProfileStateSkipped || m.State == view.ProfileStateSucceeded {
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
	return view.Profile{
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

type BundleEntity struct {
	ID           uint             `gorm:"primary_key"`
	State        view.BundleState `gorm:"index"`
	DurationSec  uint
	TargetsCount topo.CompCount `gorm:"type:TEXT"`
	StartAt      int64
	Kinds        ProfKindList `gorm:"type:TEXT"`
}

func (BundleEntity) TableName() string {
	return "profiling_v2_bundles"
}

func (m *BundleEntity) ToViewModel() view.Bundle {
	return view.Bundle{
		BundleID:     m.ID,
		State:        m.State,
		DurationSec:  m.DurationSec,
		TargetsCount: m.TargetsCount,
		StartAt:      time.Unix(m.StartAt, 0),
		Kinds:        m.Kinds,
	}
}

func autoMigrate(db *dbstore.DB) error {
	return db.AutoMigrate(&ProfileEntity{}, &BundleEntity{})
}
