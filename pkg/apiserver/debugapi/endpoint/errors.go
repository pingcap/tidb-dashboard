// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package endpoint

import (
	"github.com/joomcode/errorx"
)

var (
	ErrNS               = errorx.NewNamespace("debug_api.endpoint")
	ErrUnknownComponent = ErrNS.NewType("unknown_component")
	ErrInvalidEndpoint  = ErrNS.NewType("invalid_endpoint")
)
