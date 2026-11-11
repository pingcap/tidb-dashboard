// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package user

import (
	"encoding/json"
	"regexp"
	"strings"

	"github.com/joomcode/errorx"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
)

var ErrInsufficientPrivs = ErrNSSignIn.NewType("insufficient_priv")

// SQLUserAuthenticated marks errors raised after SQL authentication succeeded.
// The boolean property lets SQL login hide privilege failures without changing
// maintenance-mode errors or the errors consumed by SSO impersonation.
var SQLUserAuthenticated = errorx.RegisterProperty("sql_user_authenticated")

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
	return verifySQLUser(tidbClient, userName, password)
}

type sqlUserClient interface {
	OpenSQLConn(string, string) (*gorm.DB, error)
	SendGetRequest(string) ([]byte, error)
}

func verifySQLUser(tidbClient sqlUserClient, userName, password string) (bool, error) {
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
	if config.Security.SkipGrantTable {
		// Maintenance mode cannot authenticate an identity or establish privileges.
		// Do not mint a session that would outlive the maintenance window.
		return false, ErrInsufficientPrivs.New("Dashboard access requires TiDB grant tables to be enabled")
	}
	db, err := tidbClient.OpenSQLConn(userName, password)
	if err != nil {
		return false, err
	}
	defer utils.CloseTiDBConnection(db) //nolint:errcheck

	// 3. Get grants
	var grantRows []string
	err = db.Raw("show grants for current_user()").Find(&grantRows).Error
	if err != nil {
		return false, err
	}
	grants := parseUserGrants(grantRows)
	// 4. Check grants
	if !checkDashboardPriv(grants, config.Security.EnableSEM) {
		return false, ErrInsufficientPrivs.NewWithNoMessage().WithProperty(SQLUserAuthenticated, true)
	}

	return checkWriteablePriv(grants), nil
}

// Account and role names in SHOW GRANTS output may contain commas and " ON ".
// Accept only TiDB's generated privilege-list grammar so names cannot be parsed as privileges.
var grantPrivilegeListRegex = regexp.MustCompile(`^[A-Z][A-Z0-9_ ]*(, *[A-Z][A-Z0-9_ ]*)*$`)

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
		row, ok := strings.CutPrefix(row, "GRANT ")
		if !ok {
			continue
		}
		privilegeList, grantTarget, ok := strings.Cut(row, " ON ")
		if !ok || !grantPrivilegeListRegex.MatchString(privilegeList) {
			continue
		}
		// Dashboard privileges must be granted globally. Database- and table-level
		// ALL PRIVILEGES do not include the cluster privileges required by Dashboard.
		grantScope, grantee, ok := strings.Cut(grantTarget, " TO ")
		if !ok || grantScope != "*.*" || strings.TrimSpace(grantee) == "" {
			continue
		}
		for grant := range strings.SplitSeq(privilegeList, ",") {
			grants[strings.TrimSpace(grant)] = struct{}{}
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
