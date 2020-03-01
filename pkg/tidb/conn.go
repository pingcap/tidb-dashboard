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

package tidb

import (
	"database/sql/driver"
	"fmt"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/jinzhu/gorm"

	// MySQL driver used by gorm
	_ "github.com/jinzhu/gorm/dialects/mysql"
)

func (f *Forwarder) GetDBConnProps() (host string, port int, err error) {
	info, err := f.getServerInfo()
	if err == nil {
		host = info.IP
		port = info.Port
	}
	return
}

func (f *Forwarder) OpenTiDB(user string, pass string) (*gorm.DB, error) {
	host, port, err := f.GetDBConnProps()
	if err != nil {
		return nil, err
	}

	dsnConfig := mysql.NewConfig()
	dsnConfig.Net = "tcp"
	dsnConfig.Addr = fmt.Sprintf("%s:%d", host, port)
	dsnConfig.User = user
	dsnConfig.Passwd = pass
	dsnConfig.Timeout = time.Second
	dsn := dsnConfig.FormatDSN()

	db, err := gorm.Open("mysql", dsn)
	if err != nil {
		if err == driver.ErrBadConn {
			return nil, ErrTiDBConnFailed.Wrap(err, "failed to connect to TiDB")
		} else if mysqlErr, ok := err.(*mysql.MySQLError); ok {
			if mysqlErr.Number == 1045 {
				return nil, ErrTiDBAuthFailed.New("bad TiDB username or password")
			}
		}
		return nil, err
	}

	return db, nil
}
