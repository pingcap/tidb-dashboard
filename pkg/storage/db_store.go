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

package storage

import (
	"os"
	"path"

	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/sqlite"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

type Store struct {
	*gorm.DB
}

func MustOpenDBStore(config *config.Config) *Store {
	err := os.MkdirAll(config.DataDir, 0777)
	if err != nil {
		panic(err)
	}
	db, err := gorm.Open("sqlite3", path.Join(config.DataDir, "dashboard.sqlite.db"))
	if err != nil {
		panic(err)
	}
	return &Store{db}
}
