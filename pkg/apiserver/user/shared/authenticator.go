// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package shared

import "github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"

type AuthenticatorRegister interface {
	Register(typeID utils.AuthType, a Authenticator)
}

type AuthenticateForm struct {
	Type     utils.AuthType `json:"type" example:"0"`
	Username string         `json:"username" example:"root"` // Does not present for AuthTypeSharingCode
	Password string         `json:"password"`
	Extra    string         `json:"extra"` // FIXME: Use strong type
}

type SignOutInfo struct {
	EndSessionURL string `json:"end_session_url"`
}

type Authenticator interface {
	IsEnabled() (bool, error)
	Authenticate(form AuthenticateForm) (*utils.SessionUser, error)
	ProcessSession(u *utils.SessionUser) bool
	SignOutInfo(u *utils.SessionUser, redirectURL string) (*SignOutInfo, error)
}

type BaseAuthenticator struct{}

func (a BaseAuthenticator) IsEnabled() (bool, error) {
	return true, nil
}

func (a BaseAuthenticator) ProcessSession(u *utils.SessionUser) bool {
	return true
}

func (a BaseAuthenticator) SignOutInfo(u *utils.SessionUser, redirectURL string) (*SignOutInfo, error) {
	return &SignOutInfo{}, nil
}
