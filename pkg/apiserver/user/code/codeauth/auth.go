// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package codeauth

import (
	"time"

	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/code"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/sso"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
)

const typeID = utils.AuthTypeCode

var ErrSignInInvalidCode = user.ErrNSSignIn.NewType("invalid_code") // Invalid or expired

type Authenticator struct {
	user.BaseAuthenticator
	sharingCodeService *code.Service
	ssoService         ssoSessionValidator
}

type ssoSessionValidator interface {
	IsSessionValid(*utils.SessionUser) bool
}

func newAuthenticator(sharingCodeService *code.Service, ssoService *sso.Service) *Authenticator {
	return &Authenticator{
		sharingCodeService: sharingCodeService,
		ssoService:         ssoService,
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
	session := a.sharingCodeService.NewSessionFromSharingCode(f.Password)
	if session == nil {
		return nil, ErrSignInInvalidCode.NewWithNoMessage()
	}
	return session, nil
}

func (a *Authenticator) ProcessSession(u *utils.SessionUser) bool {
	return !time.Now().After(u.SharedSessionExpireAt) &&
		(u.SSOConfigRevision == "" || a.ssoService.IsSessionValid(u))
}
