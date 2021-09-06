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
	EnableSEM bool `json:"enable-sem"`
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

	// Check dashboard privileges
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
	grants := parseUserGrants(grantRows)
	// 3. Check
	if !checkDashboardPriv(grants, config.Security.EnableSEM) {
		// TODO: add doc link that explains what privileges are needed
		return nil, user.ErrInsufficientPriv.NewWithNoMessage()
	}

	return &utils.SessionUser{
		Version:      utils.SessionVersion,
		HasTiDBAuth:  true,
		TiDBUsername: f.Username,
		TiDBPassword: f.Password,
		DisplayName:  f.Username,
		IsShareable:  true,
		IsWriteable:  checkWriteablePriv(grants),
	}, nil
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
