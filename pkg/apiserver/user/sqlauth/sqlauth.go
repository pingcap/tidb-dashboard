// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package sqlauth

import (
	"github.com/joomcode/errorx"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/shared"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
)

const typeID utils.AuthType = 0

type Authenticator struct {
	shared.BaseAuthenticator
	tidbClient       *tidb.Client
	userFeatureFlags *shared.UserFeatureFlags
}

func registerAuthenticator(r shared.AuthenticatorRegister, tidbClient *tidb.Client, ff *shared.UserFeatureFlags) {
	r.Register(typeID, &Authenticator{
		tidbClient:       tidbClient,
		userFeatureFlags: ff,
	})
}

var Module = fx.Options(
	fx.Invoke(registerAuthenticator),
)

func (a *Authenticator) Authenticate(f shared.AuthenticateForm) (*utils.SessionUser, error) {
	writeable, err := shared.VerifySQLUser(a.tidbClient, a.userFeatureFlags, f.Username, f.Password)
	if err != nil {
		if errorx.Cast(err) == nil {
			return nil, shared.ErrSignInOther.WrapWithNoMessage(err)
		}
		// Possible errors could be:
		// tidb.ErrNoAliveTiDB
		// tidb.ErrPDAccessFailed
		// tidb.ErrTiDBConnFailed
		// tidb.ErrTiDBAuthFailed
		// shared.ErrInsufficientPrivs
		return nil, err
	}

	return &utils.SessionUser{
		Version:      utils.SessionVersion,
		HasTiDBAuth:  true,
		TiDBUsername: f.Username,
		TiDBPassword: f.Password,
		DisplayName:  f.Username,
		IsShareable:  true,
		IsWriteable:  writeable,
	}, nil
}
