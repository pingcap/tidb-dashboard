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

package user

import (
	"encoding/json"
	"regexp"
	"strings"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
)

var (
	ErrInsufficientPrivs = ErrNS.NewType("insufficient_privileges")
)

// TiDB config response
//
// "security": {
//   ...
//   "enable-sem": true/false,
//   ...
// },
type tidbSecurityConfig struct {
	Security tidbSEMConfig `json:"security"`
}

type tidbSEMConfig struct {
	EnableSEM bool `json:"enable-sem"`
}

func VerifySQLUser(tidbClient *tidb.Client, userName, password string) (writeable bool, err error) {
	db, err := tidbClient.OpenSQLConn(userName, password)
	if err != nil {
		return false, err
	}
	defer utils.CloseTiDBConnection(db) //nolint:errcheck

	// Check dashboard privileges
	// 1. Check whether TiDB SEM is enabled
	resData, err := tidbClient.SendGetRequest("/config")
	if err != nil {
		return false, err
	}
	var config tidbSecurityConfig
	err = json.Unmarshal(resData, &config)
	if err != nil {
		return false, err
	}
	// 2. Get grants
	var grantRows []string
	err = db.Raw("show grants for current_user()").Find(&grantRows).Error
	if err != nil {
		return false, err
	}
	grants := parseUserGrants(grantRows)
	// 3. Check
	if !checkDashboardPriv(grants, config.Security.EnableSEM) {
		return false, ErrInsufficientPrivs.NewWithNoMessage()
	}

	return checkWriteablePriv(grants), nil
}

var grantRegex = regexp.MustCompile(`GRANT (.+) ON`)

// Currently, There are 2 kinds of grant output format in TiDB:
// - GRANT [grants] ON [db.table] TO [user]
// - GRANT [roles] TO [user]
// Examples:
// - GRANT PROCESS,SHOW DATABASES,CONFIG ON *.* TO 'dashboardAdmin'@'%'
// - GRANT SYSTEM_VARIABLES_ADMIN,RESTRICTED_VARIABLES_ADMIN,RESTRICTED_STATUS_ADMIN,RESTRICTED_TABLES_ADMIN ON *.* TO 'dashboardAdmin'@'%'
// - GRANT ALL PRIVILEGES ON *.* TO 'dashboardAdmin'@'%'
// - GRANT `app_read`@`%` TO `test`@`%`
func parseUserGrants(grantRows []string) map[string]struct{} {
	grants := map[string]struct{}{}

	for _, row := range grantRows {
		m := grantRegex.FindStringSubmatch(row)
		if len(m) == 2 {
			curRowGrants := strings.Split(m[1], ",")
			for _, grant := range curRowGrants {
				grants[grant] = struct{}{}
			}
		}
	}

	return grants
}

// To access TiDB Dashboard, following base privileges are required
// - ALL PRIVILEGES
// - or
// - PROCESS
// - SHOW DATABASES
// - CONFIG
// - DASHBOARD_CLIENT or SUPER (SUPER includes DASHBOARD_CLIENT)
// When TiDB SEM is enabled, following extra privileges are required
// - RESTRICTED_VARIABLES_ADMIN
// - RESTRICTED_TABLES_ADMIN
// - RESTRICTED_STATUS_ADMIN
func checkDashboardPriv(privs map[string]struct{}, enableSEM bool) bool {
	if enableSEM {
		// Note: When SEM is enabled, these additional privileges need to be checked even if "ALL PRIVILEGES" is granted.
		if !hasPriv("RESTRICTED_VARIABLES_ADMIN", privs) {
			return false
		}
		if !hasPriv("RESTRICTED_TABLES_ADMIN", privs) {
			return false
		}
		if !hasPriv("RESTRICTED_TABLES_ADMIN", privs) {
			return false
		}
	}

	if hasPriv("ALL PRIVILEGES", privs) {
		// ALL PRIVILEGES contains privileges below. If it is set, privilege requirement is met.
		return true
	}
	if !hasPriv("PROCESS", privs) {
		return false
	}
	if !hasPriv("SHOW DATABASES", privs) {
		return false
	}
	if !hasPriv("CONFIG", privs) {
		return false
	}

	if hasPriv("SUPER", privs) {
		// SUPER contains privileges below. If it is set, privilege requirement is met.
		return true
	}
	if !hasPriv("DASHBOARD_CLIENT", privs) {
		return false
	}

	return true
}

func checkWriteablePriv(privs map[string]struct{}) bool {
	if hasPriv("ALL PRIVILEGES", privs) {
		return true
	}
	if hasPriv("SUPER", privs) {
		return true
	}
	if hasPriv("SYSTEM_VARIABLES_ADMIN", privs) {
		return true
	}
	return false
}

func hasPriv(priv string, privs map[string]struct{}) bool {
	_, ok := privs[priv]
	return ok
}
