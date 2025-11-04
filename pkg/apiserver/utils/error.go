// Copyright 2025 PingCAP, Inc. Licensed under Apache-2.0.

package utils //revive:disable-line:var-naming

import (
	"github.com/joomcode/errorx"
)

var ErrNS = errorx.NewNamespace("error.api")

var ErrExpNotEnabled = ErrNS.NewType("experimental_feature_not_enabled")
