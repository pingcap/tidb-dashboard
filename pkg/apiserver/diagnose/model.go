// Copyright 2020 PingCAP, Inc.
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

package diagnose

import (
	"time"

	"github.com/google/uuid"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

type Report struct {
	ID               string     `gorm:"primary_key" gorm:"size:40" json:"id"`
	CreatedAt        time.Time  `json:"created_at"`
	Progress         int        `json:"progress"` // 0~100
	Content          string     `json:"content"`
	StartTime        time.Time  `json:"start_time"`
	EndTime          time.Time  `json:"end_time"`
	CompareStartTime *time.Time `json:"compare_start_time"`
	CompareEndTime   *time.Time `json:"compare_end_time"`
}

func (Report) TableName() string {
	return "diagnose_reports"
}

func autoMigrate(db *dbstore.DB) error {
	return db.AutoMigrate(&Report{}).
		Error
}

func NewReport(db *dbstore.DB, startTime, endTime time.Time, compareStartTime, compareEndTime *time.Time) (string, error) {
	report := Report{
		ID:               uuid.New().String(),
		CreatedAt:        time.Now(),
		StartTime:        startTime,
		EndTime:          endTime,
		CompareStartTime: compareStartTime,
		CompareEndTime:   compareEndTime,
	}
	err := db.Create(&report).Error
	if err != nil {
		return "", err
	}
	return report.ID, nil
}

func GetReports(db *dbstore.DB) ([]Report, error) {
	var reports []Report
	err := db.
		Select("id, created_at, progress, start_time, end_time, compare_start_time, compare_end_time").
		Order("created_at desc").
		Find(&reports).Error
	return reports, err
}

func GetReport(db *dbstore.DB, reportID string) (*Report, error) {
	var report Report
	err := db.Where("id = ?", reportID).First(&report).Error
	return &report, err
}

func UpdateReportProgress(db *dbstore.DB, reportID string, progress int) error {
	var report Report
	report.ID = reportID
	return db.Model(&report).Update("progress", progress).Error
}

func SaveReportContent(db *dbstore.DB, reportID string, content string) error {
	var report Report
	report.ID = reportID
	return db.Model(&report).Update("content", content).Error
}
