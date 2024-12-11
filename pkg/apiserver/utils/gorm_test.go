// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"testing"

	"github.com/pingcap/check"
)

func TestT(t *testing.T) {
	check.CustomVerboseFlag = true
	check.TestingT(t)
}

var _ = check.Suite(&testGormSuite{})

type testGormSuite struct{}

func (t *testGormSuite) Test_GetGormColumnName(c *check.C) {
	c.Assert(GetGormColumnName(`column:db`), check.Equals, `db`)
	c.Assert(GetGormColumnName(`primaryKey;index`), check.Equals, ``)
	c.Assert(GetGormColumnName(`column:db;primaryKey;index`), check.Equals, `db`)
}
