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

package statement

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	_ "github.com/go-sql-driver/mysql" // init mysql

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

// TiDB connection info, should come from config
const (
	userName = "root"
	password = ""
	network  = "tcp"
	server   = "127.0.0.1"
	port     = 4000
	database = "performance_schema"
)

func OpenTiDB(config *config.Config) *sql.DB {
	conn := fmt.Sprintf("%s:%s@%s(%s:%d)/%s", userName, password, network, server, port, database)
	db, err := sql.Open("mysql", conn)
	if err != nil {
		log.Error("Connect to tidb failed: ", zap.Error(err))
		return nil
	}
	// defer db.Close()

	// setting
	db.SetConnMaxLifetime(100 * time.Second)
	db.SetMaxOpenConns(100)

	return db
}
