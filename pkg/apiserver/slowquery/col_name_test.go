// Copyright 2021 PingCAP, Inc.
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

package slowquery

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/thoas/go-funk"
)

type TestStruct struct {
	ParseTime   float64 `gorm:"column:Parse_time" json:"parse_time"`
	CompileTime float64 `gorm:"column:Compile_time" json:"compile_time"`
}

var filterList []string = []string{"Parse_time", "Compile_time"}

func TestFilterFieldsBy_with_limited_filter_list(t *testing.T) {
	fields, _ := filterFieldsBy(TestStruct{
		ParseTime:   1,
		CompileTime: 1,
	}, []string{"Parse_time"})

	assert.Equal(t, fields, []string{"Parse_time"})
}

func TestFilterFieldsBy_with_allowlist(t *testing.T) {
	fields, _ := filterFieldsBy(TestStruct{
		ParseTime:   1,
		CompileTime: 1,
	}, filterList, []string{"parse_time"}...)

	assert.Equal(t, fields, []string{"Parse_time"})
}

func TestFilterFieldsBy_without_allowlist(t *testing.T) {
	fields, _ := filterFieldsBy(TestStruct{
		ParseTime:   1,
		CompileTime: 1,
	}, filterList)

	assert.Equal(t, true, len(funk.Join(fields, []string{"Parse_time", "Compile_time"}, funk.InnerJoin).([]string)) == len(fields))
}

func TestFilterFieldsBy_field_not_in_filter_list_with_projection_tag_field_struct(t *testing.T) {
	fields, _ := filterFieldsBy(struct {
		ParseTime   float64 `gorm:"column:Parse_time" json:"parse_time"`
		CompileTime float64 `gorm:"column:Compile_time" json:"compile_time"`
		Timestamp   float64 `gorm:"column:timestamp" proj:"(UNIX_TIMESTAMP(Time) + 0E0)" json:"timestamp"`
	}{
		ParseTime:   1,
		CompileTime: 1,
		Timestamp:   1,
	}, filterList)

	assert.Equal(t, true, len(funk.Join(fields, []string{"Parse_time", "Compile_time", "(UNIX_TIMESTAMP(Time) + 0E0) AS timestamp"}, funk.InnerJoin).([]string)) == len(fields))
}

func TestFilterFieldsBy_field_not_in_filter_list_without_projection_tag_field_struct(t *testing.T) {
	fields, _ := filterFieldsBy(struct {
		ParseTime   float64 `gorm:"column:Parse_time" json:"parse_time"`
		CompileTime float64 `gorm:"column:Compile_time" json:"compile_time"`
		Timestamp   float64 `gorm:"column:timestamp" json:"timestamp"`
	}{
		ParseTime:   1,
		CompileTime: 1,
		Timestamp:   1,
	}, filterList)

	assert.Equal(t, true, len(funk.Join(fields, []string{"Parse_time", "Compile_time"}, funk.InnerJoin).([]string)) == len(fields))
}

func TestFilterFieldsBy_with_uncorrect_gorm_tag_field_struct(t *testing.T) {
	fields, _ := filterFieldsBy(struct {
		ParseTime   float64 `gorm:"column:Parse_time" json:"parse_time"`
		CompileTime float64 `gorm:"column:Compile_time" json:"compile_time"`
		Instance    string  `gorm:"col:INSTANCE" json:"instance"`
	}{
		ParseTime:   1,
		CompileTime: 1,
		Instance:    "1",
	}, filterList)

	assert.Equal(t, true, len(funk.Join(fields, []string{"Parse_time", "Compile_time"}, funk.InnerJoin).([]string)) == len(fields))
}
