// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package matrix

import (
	"testing"

	"github.com/pingcap/check"
)

func TestMatrix(t *testing.T) {
	check.TestingT(t)
}

var _ = check.Suite(&testMatrixSuite{})

type testMatrixSuite struct{}
