// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

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
	tidbClient  *tidb.Client
	authService *user.AuthService
}

func NewAuthenticator(tidbClient *tidb.Client) *Authenticator {
	return &Authenticator{
		tidbClient: tidbClient,
	}
}

func registerAuthenticator(a *Authenticator, authService *user.AuthService) {
	authService.RegisterAuthenticator(typeID, a)
	a.authService = authService
}

var Module = fx.Options(
	fx.Provide(NewAuthenticator),
	fx.Invoke(registerAuthenticator),
)

func (a *Authenticator) Authenticate(f user.AuthenticateForm) (*utils.SessionUser, error) {
	plainPwd, err := user.Decrypt(f.Password, a.authService.RsaPrivateKey)
	if err != nil {
		return nil, user.ErrSignInOther.WrapWithNoMessage(err)
	}

	writeable, err := user.VerifySQLUser(a.tidbClient, f.Username, plainPwd)
	if err != nil {
		if errorx.Cast(err) == nil {
			return nil, user.ErrSignInOther.WrapWithNoMessage(err)
		}
		// Possible errors could be:
		// tidb.ErrNoAliveTiDB
		// tidb.ErrPDAccessFailed
		// tidb.ErrTiDBConnFailed
		// tidb.ErrTiDBAuthFailed
		// user.ErrInsufficientPrivs
		return nil, err
	}

	return &utils.SessionUser{
		Version:      utils.SessionVersion,
		HasTiDBAuth:  true,
		TiDBUsername: f.Username,
		TiDBPassword: plainPwd,
		DisplayName:  f.Username,
		IsShareable:  true,
		IsWriteable:  writeable,
	}, nil
}
