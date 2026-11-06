// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package sqlauth

import (
	"crypto/rand"
	"encoding/base64"

	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
)

const typeID = utils.AuthTypeSQL

type Authenticator struct {
	user.BaseAuthenticator
	authService   *user.AuthService
	verifySQLUser func(string, string) (bool, error)
}

func NewAuthenticator(tidbClient *tidb.Client) *Authenticator {
	return &Authenticator{
		verifySQLUser: func(name, password string) (bool, error) {
			return user.VerifySQLUser(tidbClient, name, password)
		},
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
	var fallback [32]byte
	if _, err := rand.Read(fallback[:]); err != nil {
		return nil, user.ErrSignInOther.NewWithNoMessage()
	}
	plainPwd, decryptErr := user.Decrypt(f.Password, a.authService.RsaPrivateKey)
	if decryptErr != nil {
		plainPwd = base64.RawURLEncoding.EncodeToString(fallback[:])
	}

	// Keep legacy ciphertexts compatible, but do not reveal padding validity via
	// a different error or by skipping SQL authentication. This is not a claim
	// that the legacy RSA primitive or its SQL backend runs in constant time.
	writeable, err := a.verifySQLUser(f.Username, plainPwd)
	if err != nil {
		authenticated, _ := errorx.ExtractProperty(err, user.SQLUserAuthenticated)
		privilegeDenied := authenticated == true && errorx.IsOfType(err, user.ErrInsufficientPrivs)
		if privilegeDenied {
			log.Info("SQL login rejected: insufficient Dashboard privileges")
		}
		if privilegeDenied || errorx.IsOfType(err, tidb.ErrTiDBAuthFailed) {
			// Do not expose whether a rejected SQL credential was valid. Start a
			// fresh error so neither its message nor its cause reveals the reason.
			return nil, tidb.ErrTiDBAuthFailed.NewWithNoMessage()
		}
		if errorx.Cast(err) == nil {
			return nil, user.ErrSignInOther.NewWithNoMessage()
		}
		// Possible errors could be:
		// tidb.ErrNoAliveTiDB
		// tidb.ErrPDAccessFailed
		// tidb.ErrTiDBConnFailed
		// tidb.ErrTiDBAuthFailed
		// user.ErrInsufficientPrivs
		return nil, err
	}
	// Never accept replacement credentials, even if the backend accepted them.
	if decryptErr != nil {
		return nil, tidb.ErrTiDBAuthFailed.NewWithNoMessage()
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
