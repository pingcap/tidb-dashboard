// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package shared

import "github.com/joomcode/errorx"

var (
	ErrNS                  = errorx.NewNamespace("error.api.user")
	ErrUnsupportedAuthType = ErrNS.NewType("unsupported_auth_type")
	ErrUnsupportedUser     = ErrNS.NewType("unsupported_user")
	ErrNSSignIn            = ErrNS.NewSubNamespace("signin")
	ErrSignInOther         = ErrNSSignIn.NewType("other")
	ErrInsufficientPrivs   = ErrNSSignIn.NewType("insufficient_priv")
)
