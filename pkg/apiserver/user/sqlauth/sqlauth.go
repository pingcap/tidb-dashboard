package sqlauth

import (
	"github.com/joomcode/errorx"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
)

const typeID utils.AuthType = 0

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
	// Currently we don't support privileges, so only root user is allowed to sign in.
	if f.Username != "root" {
		return nil, user.ErrSignInOther.New("non root user is not allowed")
	}
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
