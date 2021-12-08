// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package codeauth

import (
	"time"

	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/code"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/shared"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
)

const typeID utils.AuthType = 1

var ErrSignInInvalidCode = shared.ErrNSSignIn.NewType("invalid_code") // Invalid or expired

type Authenticator struct {
	shared.BaseAuthenticator
	sharingCodeService *code.Service
}

func registerAuthenticator(r shared.AuthenticatorRegister, sharingCodeService *code.Service) {
	r.Register(typeID, &Authenticator{
		sharingCodeService: sharingCodeService,
	})
}

var Module = fx.Options(
	fx.Invoke(registerAuthenticator),
)

func (a *Authenticator) Authenticate(f shared.AuthenticateForm) (*utils.SessionUser, error) {
	session := a.sharingCodeService.NewSessionFromSharingCode(f.Password)
	if session == nil {
		return nil, ErrSignInInvalidCode.NewWithNoMessage()
	}
	return session, nil
}

func (a *Authenticator) ProcessSession(user *utils.SessionUser) bool {
	return !time.Now().After(user.SharedSessionExpireAt)
}
