// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package storage

import (
	"testing"

	"github.com/pingcap/check"
)

func TestRegion(t *testing.T) {
	check.TestingT(t)
}

var _ = check.Suite(&testRegionSuite{})

type testRegionSuite struct{}
