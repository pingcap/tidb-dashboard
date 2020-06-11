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
	"io/ioutil"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/jinzhu/gorm"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	// MySQL driver used by gorm
	_ "github.com/jinzhu/gorm/dialects/mysql"
)

const (
	envTidbOverrideEndpointKey = "TIDB_OVERRIDE_ENDPOINT"
)

var (
	ErrTiDBConnFailed          = ErrNS.NewType("tidb_conn_failed")
	ErrTiDBAuthFailed          = ErrNS.NewType("tidb_auth_failed")
	ErrTiDBClientRequestFailed = ErrNS.NewType("client_request_failed")
)

func (f *Forwarder) GetStatusConnProps() (string, int) {
	return "127.0.0.1", f.statusPort
}

func (f *Forwarder) OpenTiDB(user string, pass string) (*gorm.DB, error) {
	var addr string
	addr = os.Getenv(envTidbOverrideEndpointKey)
	if len(addr) < 1 {
		addr = fmt.Sprintf("127.0.0.1:%d", f.tidbPort)
	}
	dsnConfig := mysql.NewConfig()
	dsnConfig.Net = "tcp"
	dsnConfig.Addr = addr
	dsnConfig.User = user
	dsnConfig.Passwd = pass
	dsnConfig.Timeout = time.Second
	dsnConfig.ParseTime = true
	dsnConfig.Loc = time.Local
	if f.config.TiDBTLSConfig != nil {
		dsnConfig.TLSConfig = "tidb"
	}
	dsn := dsnConfig.FormatDSN()

	db, err := gorm.Open("mysql", dsn)
	if err != nil {
		if _, ok := err.(*net.OpError); ok || err == driver.ErrBadConn {
			if strings.HasPrefix(addr, "0.0.0.0:") {
				log.Warn("The IP reported by TiDB is 0.0.0.0, which may not have the -advertise-address option")
			}
			return nil, ErrTiDBConnFailed.Wrap(err, "failed to connect to TiDB")
		} else if mysqlErr, ok := err.(*mysql.MySQLError); ok {
			if mysqlErr.Number == 1045 {
				return nil, ErrTiDBAuthFailed.New("bad TiDB username or password")
			}
		}
		log.Warn("unknown error occurred while OpenTiDB", zap.Error(err))
		return nil, err
	}

	return db, nil
}

func (f *Forwarder) SendGetRequest(path string) ([]byte, error) {
	uri := fmt.Sprintf("%s://127.0.0.1:%d%s", f.uriScheme, f.statusPort, path)
	req, err := http.NewRequestWithContext(f.lifecycleCtx, "GET", uri, nil)
	if err != nil {
		return nil, ErrTiDBClientRequestFailed.Wrap(err, "failed to build request for TiDB API %s", path)
	}

	resp, err := f.httpClient.Do(req)
	if err != nil {
		return nil, ErrTiDBClientRequestFailed.Wrap(err, "failed to send request to TiDB API %s", path)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, ErrTiDBClientRequestFailed.New("received non success status code %d from TiDB API %s", resp.StatusCode, path)
	}

	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, ErrTiDBClientRequestFailed.Wrap(err, "failed to read response from TiDB API %s", path)
	}

	return data, nil
}
