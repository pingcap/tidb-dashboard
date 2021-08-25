package sqlauth

import (
	"encoding/json"
	"regexp"
	"strings"

	"github.com/joomcode/errorx"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
)

const typeID utils.AuthType = 0

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

type Authenticator struct {
	user.BaseAuthenticator
	tidbClient *tidb.Client
}

func newAuthenticator(tidbClient *tidb.Client) *Authenticator {
	return &Authenticator{
		tidbClient: tidbClient,
	}
}

func registerAuthenticator(a *Authenticator, authService *user.AuthService) {
	authService.RegisterAuthenticator(typeID, a)
}

var Module = fx.Options(
	fx.Provide(newAuthenticator),
	fx.Invoke(registerAuthenticator),
)

func (a *Authenticator) Authenticate(f user.AuthenticateForm) (*utils.SessionUser, error) {
	db, err := a.tidbClient.OpenSQLConn(f.Username, f.Password)
	if err != nil {
		if errorx.Cast(err) == nil {
			return nil, user.ErrSignInOther.WrapWithNoMessage(err)
		}
		// Possible errors could be:
		// tidb.ErrNoAliveTiDB
		// tidb.ErrPDAccessFailed
		// tidb.ErrTiDBConnFailed
		// tidb.ErrTiDBAuthFailed
		return nil, err
	}
	defer utils.CloseTiDBConnection(db) //nolint:errcheck

	// Check privileges
	// 1. Check whether TiDB SEM is enabled
	resData, err := a.tidbClient.SendGetRequest("/config")
	if err != nil {
		return nil, user.ErrSignInOther.WrapWithNoMessage(err)
	}
	var config tidbSecurityConfig
	err = json.Unmarshal(resData, &config)
	if err != nil {
		return nil, user.ErrSignInOther.WrapWithNoMessage(err)
	}
	// 2. Get grants
	var grantRows []string
	err = db.Raw("show grants for current_user()").Find(&grantRows).Error
	if err != nil {
		return nil, user.ErrSignInOther.WrapWithNoMessage(err)
	}
	grants := parseCurUserGrants(grantRows)
	// 3. Check
	// Following base privileges are required
	// - ALL PRIVILEGES
	// - or
	// - PROCESS
	// - SHOW DATABASES
	// - SYSTEM_VARIABLES_ADMIN or SUPER (SUPER includes SYSTEM_VARIABLES_ADMIN)
	// - CONFIG
	// - DASHBOARD_CLIENT
	// When TiDB SEM is enabled, following extra privileges are required
	// - RESTRICTED_VARIABLES_ADMIN
	// - RESTRICTED_TABLES_ADMIN
	// - RESTRICTED_STATUS_ADMIN
	hasPriv := func(priv string) bool {
		for _, grant := range grants {
			if priv == grant {
				return true
			}
		}
		return false
	}
	fullfillPrivileges := false
	if hasPriv("ALL PRIVILEGES") {
		fullfillPrivileges = true
	} else {
		if !hasPriv("PROCESS") {
			fullfillPrivileges = false
		} else if !hasPriv("SHOW DATABASES") {
			fullfillPrivileges = false
		} else if !hasPriv("SYSTEM_VARIABLES_ADMIN") && !hasPriv("SUPER") {
			fullfillPrivileges = false
		} else if !hasPriv("CONFIG") {
			fullfillPrivileges = false
		} else if !hasPriv("DASHBOARD_CLIENT") {
			fullfillPrivileges = false
		} else {
			fullfillPrivileges = true
		}
	}
	if config.Security.EnableSem {
		fullfillPrivileges =
			fullfillPrivileges &&
				hasPriv("RESTRICTED_VARIABLES_ADMIN") &&
				hasPriv("RESTRICTED_TABLES_ADMIN") &&
				hasPriv("RESTRICTED_STATUS_ADMIN")
	}
	if !fullfillPrivileges {
		return nil, user.ErrMissPrivileges.NewWithNoMessage()
	}

	return &utils.SessionUser{
		Version:      utils.SessionVersion,
		HasTiDBAuth:  true,
		TiDBUsername: f.Username,
		TiDBPassword: f.Password,
		DisplayName:  f.Username,
		IsShareable:  true,
		IsWriteable:  true,
	}, nil
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
