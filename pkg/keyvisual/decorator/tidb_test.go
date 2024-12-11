// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package decorator

import (
	"github.com/pingcap/check"
)

var _ = check.Suite(&testTiDBSuite{})

type testTiDBSuite struct{}
