// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package user

import (
	"encoding/json"
	"regexp"
	"strings"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
)

var ErrInsufficientPrivs = ErrNSSignIn.NewType("insufficient_priv")

// TiDB config response
//
//	"security": {
//	  ...
//	  "enable-sem": true/false,
//	  ...
//	},.
type tidbSecurityConfig struct {
	Security tidbSEMConfig `json:"security"`
}

type tidbSEMConfig struct {
	EnableSEM      bool `json:"enable-sem"`
	SkipGrantTable bool `json:"skip-grant-table"`
}

func VerifySQLUser(tidbClient *tidb.Client, userName, password string) (writeable bool, err error) {
	db, err := tidbClient.OpenSQLConn(userName, password)
	if err != nil {
		return false, err
	}
	defer utils.CloseTiDBConnection(db) //nolint:errcheck

	// Check dashboard privileges
	// 1. Get TiDB config
	resData, err := tidbClient.SendGetRequest("/config")
	if err != nil {
		return false, err
	}
	var config tidbSecurityConfig
	err = json.Unmarshal(resData, &config)
	if err != nil {
		return false, err
	}
	// 2. Check SkipGrantTable
	// Note: Currently, if TiDB enable the skip-grant-table, running `show grants` will get error.
	// So this is a workaround before the above bug is fixed.
	if config.Security.SkipGrantTable {
		return true, nil
	}
	// 3. Get grants
	var grantRows []string
	err = db.Raw("show grants for current_user()").Find(&grantRows).Error
	if err != nil {
		return false, err
	}
	grants := parseUserGrants(grantRows)
	// 4. Check grants
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
// - GRANT `app_read`@`%` TO `test`@`%`.
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
// - RESTRICTED_STATUS_ADMIN.
func checkDashboardPriv(privs map[string]struct{}, enableSEM bool) bool {
	if enableSEM {
		// Note: When SEM is enabled, these additional privileges need to be checked even if "ALL PRIVILEGES" is granted.
		if !hasPriv("RESTRICTED_VARIABLES_ADMIN", privs) {
			return false
		}
		if !hasPriv("RESTRICTED_TABLES_ADMIN", privs) {
			return false
		}
		if !hasPriv("RESTRICTED_STATUS_ADMIN", privs) {
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
