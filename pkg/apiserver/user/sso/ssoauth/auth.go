// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package ssoauth

import (
	"encoding/json"

	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/sso"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

const typeID utils.AuthType = 2

type Authenticator struct {
	user.BaseAuthenticator
	ssoService *sso.Service
}

func newAuthenticator(ssoService *sso.Service) *Authenticator {
	return &Authenticator{
		ssoService: ssoService,
	}
}

func registerAuthenticator(a *Authenticator, authService *user.AuthService) {
	authService.RegisterAuthenticator(typeID, a)
}

var Module = fx.Options(
	fx.Provide(newAuthenticator),
	fx.Invoke(registerAuthenticator),
)

type SSOExtra struct {
	Code         string `json:"code"`
	CodeVerifier string `json:"code_verifier"`
	RedirectURL  string `json:"redirect_url"`
}

func (a *Authenticator) Authenticate(f user.AuthenticateForm) (*utils.SessionUser, error) {
	var extra SSOExtra
	err := json.Unmarshal([]byte(f.Extra), &extra)
	if err != nil {
		return nil, rest.ErrBadRequest.Wrap(err, "Invalid extra payload")
	}
	u, err := a.ssoService.NewSessionFromOAuthExchange(extra.RedirectURL, extra.Code, extra.CodeVerifier)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (a *Authenticator) IsEnabled() (bool, error) {
	return a.ssoService.IsEnabled()
}

func (a *Authenticator) SignOutInfo(u *utils.SessionUser, redirectURL string) (*user.SignOutInfo, error) {
	esURL, err := a.ssoService.BuildEndSessionURL(u, redirectURL)
	if err != nil {
		return nil, err
	}
	return &user.SignOutInfo{
		EndSessionURL: esURL,
	}, nil
}
