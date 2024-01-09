// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package tidbclient

import (
	"context"
	"errors"
	"net"
	"strconv"
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
	// ErrAuthFailed means the authentication is failed when connecting to the TiDB Server.
	ErrAuthFailed = ErrNS.NewType("tidb_auth_failed")
	// ErrConnFailed means there is a connection (like network) problem when connecting to the TiDB Server.
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
	dsnConfig.Addr = net.JoinHostPort(c.config.Host, strconv.Itoa(c.config.Port))
	dsnConfig.User = user
	dsnConfig.Passwd = pass
	dsnConfig.Timeout = time.Second * 60
	dsnConfig.ParseTime = true
	dsnConfig.Loc = time.Local
	dsnConfig.MultiStatements = true // TODO: Disable this, as it increase security risk.
	dsnConfig.TLSConfig = c.config.TLSKey
	dsn := dsnConfig.FormatDSN()

	db, err := gorm.Open(mysqlDriver.Open(dsn))
	if err != nil {
		log.Warn("Failed to open SQL connection",
			zap.String("targetComponent", distro.R().TiDB),
			zap.Error(err))
		var mysqlErr *mysql.MySQLError
		if errors.As(err, &mysqlErr) {
			if mysqlErr.Number == mysqlerr.ER_ACCESS_DENIED_ERROR {
				return nil, ErrAuthFailed.New("Bad SQL username or password")
			}
		}
		return nil, ErrConnFailed.Wrap(err, "Failed to connect to %s", distro.R().TiDB)
	}

	// Ensure that when the App stops resources are released
	if c.config.BaseContext != nil {
		db = db.WithContext(c.config.BaseContext)
	}

	return db, nil
}
