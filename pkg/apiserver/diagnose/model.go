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

	"github.com/jinzhu/gorm"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

type Report struct {
	gorm.Model
	Progress         int        `json:"progress"` // 0~100
	Content          string     `json:"content"`
	StartTime        time.Time  `json:"start_time"`
	EndTime          time.Time  `json:"end_time"`
	CompareStartTime *time.Time `json:"compare_start_time"`
	CompareEndTime   *time.Time `json:"compare_end_time"`
}

func Migrate(db *dbstore.DB) {
	db.AutoMigrate(&Report{})
}

func NewReport(db *dbstore.DB, startTime, endTime time.Time, compareStartTime, compareEndTime *time.Time) (uint, error) {
	report := Report{
		StartTime:        startTime,
		EndTime:          endTime,
		CompareStartTime: compareStartTime,
		CompareEndTime:   compareEndTime,
	}
	err := db.Create(&report).Error
	if err != nil {
		return 0, err
	}
	return report.ID, nil
}

func GetReport(db *dbstore.DB, reportID uint) (*Report, error) {
	var report Report
	err := db.First(&report, reportID).Error
	return &report, err
}

func UpdateReportProgress(db *dbstore.DB, reportID uint, progress int) error {
	var report Report
	report.ID = reportID
	return db.Model(&report).Update("progress", progress).Error
}

func SaveReportContent(db *dbstore.DB, reportID uint, content string) error {
	var report Report
	report.ID = reportID
	return db.Model(&report).Update("content", content).Error
}
