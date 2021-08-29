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

package utils

import (
	"encoding/json"
	"errors"
	"regexp"
	"strings"

	"github.com/pingcap/tidb-dashboard/pkg/tidb"
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
	EnableSem bool `json:"enable-sem"`
}

func VerifySQLUser(tidbClient *tidb.Client, user, password string) error {
	db, err := tidbClient.OpenSQLConn(user, password)
	if err != nil {
		return err
	}
	defer CloseTiDBConnection(db) //nolint:errcheck

	// Check privileges
	// 1. Check whether TiDB SEM is enabled
	resData, err := tidbClient.SendGetRequest("/config")
	if err != nil {
		return err
	}
	var config tidbSecurityConfig
	err = json.Unmarshal(resData, &config)
	if err != nil {
		return err
	}
	// 2. Get grants
	var grantRows []string
	err = db.Raw("show grants for current_user()").Find(&grantRows).Error
	if err != nil {
		return err
	}
	grants := parseCurUserGrants(grantRows)
	// 3. Check
	if !checkDashboardPrivileges(grants, config.Security.EnableSem) {
		return errors.New("miss required privileges")
	}
	return nil
}

// Currently, There are 2 kinds of grant output format in TiDB:
// - GRANT [grants] ON [db.table] TO [user]
// - GRANT [roles] TO [user]
// Examples:
// - GRANT PROCESS,SHOW DATABASES,CONFIG ON *.* TO 'dashboardAdmin'@'%'
// - GRANT SYSTEM_VARIABLES_ADMIN,RESTRICTED_VARIABLES_ADMIN,RESTRICTED_STATUS_ADMIN,RESTRICTED_TABLES_ADMIN ON *.* TO 'dashboardAdmin'@'%'
// - GRANT ALL PRIVILEGES ON *.* TO 'dashboardAdmin'@'%'
// - GRANT `app_read`@`%` TO `test`@`%`
func parseCurUserGrants(grantRows []string) []string {
	grants := make([]string, 0)
	grantRegex := regexp.MustCompile(`GRANT (.+) ON`)

	for _, row := range grantRows {
		m := grantRegex.FindStringSubmatch(row)
		if len(m) == 2 {
			curRowGrants := strings.Split(m[1], ",")
			grants = append(grants, curRowGrants...)
		}
	}

	return grants
}

// Following base privileges are required
// - ALL PRIVILEGES
// - or
// - PROCESS
// - SHOW DATABASES
// - CONFIG
// - SYSTEM_VARIABLES_ADMIN or SUPER (SUPER includes SYSTEM_VARIABLES_ADMIN)
// - DASHBOARD_CLIENT or SUPER (SUPER includes DASHBOARD_CLIENT)
// When TiDB SEM is enabled, following extra privileges are required
// - RESTRICTED_VARIABLES_ADMIN
// - RESTRICTED_TABLES_ADMIN
// - RESTRICTED_STATUS_ADMIN
func checkDashboardPrivileges(grants []string, enableSEM bool) bool {
	hasPriv := func(priv string) bool {
		for _, grant := range grants {
			if priv == grant {
				return true
			}
		}
		return false
	}

	hasAllPriv := hasPriv("ALL PRIVILEGES")
	if !hasAllPriv {
		if !hasPriv("PROCESS") {
			return false
		}
		if !hasPriv("SHOW DATABASES") {
			return false
		}
		if !hasPriv("CONFIG") {
			return false
		}
		hasSuperPriv := hasPriv("SUPER")
		if !hasSuperPriv {
			if !hasPriv("SYSTEM_VARIABLES_ADMIN") {
				return false
			}
			if !hasPriv("DASHBOARD_CLIENT") {
				return false
			}
		}
	}
	if enableSEM {
		if !hasPriv("RESTRICTED_VARIABLES_ADMIN") {
			return false
		}
		if !hasPriv("RESTRICTED_TABLES_ADMIN") {
			return false
		}
		if !hasPriv("RESTRICTED_TABLES_ADMIN") {
			return false
		}
	}
	return true
}
