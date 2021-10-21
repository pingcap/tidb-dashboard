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

package tidbclient

import (
	"context"
	"database/sql/driver"
	"fmt"
	"net"
	"time"

	"github.com/VividCortex/mysqlerr"
	"github.com/go-sql-driver/mysql"
	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.uber.org/zap"
	mysqlDriver "gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/util/distro"
)

var (
	ErrNS = errorx.NewNamespace("tidb_client")
	// ErrAuthFailed means the authentication is failed when connecting to the TiDB Server
	ErrAuthFailed = ErrNS.NewType("tidb_auth_failed")
	// ErrConnFailed means there is a connection (like network) problem when connecting to the TiDB Server
	ErrConnFailed = ErrNS.NewType("tidb_conn_failed")
)

type SQLClientConfig struct {
	BaseContext context.Context
	Host        string
	Port        int
	TLSKey      string
}

type SQLClient struct {
	config SQLClientConfig
}

func NewSQLClient(config SQLClientConfig) *SQLClient {
	client := &SQLClient{
		config: config,
	}
	return client
}

// OpenConn opens a new connection.
// NOTICE: The opened connection must be manually closed.
func (c *SQLClient) OpenConn(user string, pass string) (*gorm.DB, error) {
	dsnConfig := mysql.NewConfig()
	dsnConfig.Net = "tcp"
	dsnConfig.Addr = fmt.Sprintf("%s:%d", c.config.Host, c.config.Port)
	dsnConfig.User = user
	dsnConfig.Passwd = pass
	dsnConfig.Timeout = time.Second * 5
	dsnConfig.ParseTime = true
	dsnConfig.Loc = time.Local
	dsnConfig.MultiStatements = true // TODO: Disable this, as it increase security risk.
	dsnConfig.TLSConfig = c.config.TLSKey
	dsn := dsnConfig.FormatDSN()

	db, err := gorm.Open(mysqlDriver.Open(dsn))
	if err != nil {
		if _, ok := err.(*net.OpError); ok || err == driver.ErrBadConn {
			//if strings.HasPrefix(addr, "0.0.0.0:") {
			//	log.Warn(fmt.Sprintf("%s reported its address to be 0.0.0.0. Please specify `-advertise-address` command line parameter when running %s", distro.Data("tidb"), distro.Data("tidb")))
			//}
			//if c.forwarder.sqlProxy.noAliveRemote.Load() {
			//	return nil, forwarder2.ErrNoAliveTiDB.NewWithNoMessage()
			//}
		} else if mysqlErr, ok := err.(*mysql.MySQLError); ok {
			if mysqlErr.Number == mysqlerr.ER_ACCESS_DENIED_ERROR {
				return nil, ErrAuthFailed.New("Bad SQL username or password")
			}
		}
		log.Warn(fmt.Sprintf("Failed to open %s connection", distro.R().TiDB), zap.Error(err))
		return nil, ErrConnFailed.Wrap(err, "Failed to connect to %s", distro.R().TiDB)
	}

	// Ensure that when the App stops resources are released
	if c.config.BaseContext != nil {
		db = db.WithContext(c.config.BaseContext)
	}

	return db, nil
}
