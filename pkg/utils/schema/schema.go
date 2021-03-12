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

package schema

import (
	"fmt"

	"github.com/jinzhu/gorm"
)

type TableSchema struct {
	Field string `gorm:"column:Field" json:"field"`
}

func FetchTableColumns(db *gorm.DB, table string) ([]string, error) {
	ts, err := FetchTableSchema(db, table)
	if err != nil {
		return nil, err
	}

	var cs []string
	for _, s := range ts {
		cs = append(cs, s.Field)
	}
	return cs, nil
}

func FetchTableSchema(db *gorm.DB, table string) ([]TableSchema, error) {
	var ts []TableSchema
	err := db.Raw(fmt.Sprintf("DESC %s", table)).Scan(&ts).Error
	if err != nil {
		return nil, err
	}

	return ts, nil
}
