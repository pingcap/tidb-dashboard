// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"testing"

	. "github.com/pingcap/check"
)

func TestT(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testGormSuite{})

type testGormSuite struct{}

func (t *testGormSuite) Test_GetGormColumnName(c *C) {
	c.Assert(GetGormColumnName(`column:db`), Equals, `db`)
	c.Assert(GetGormColumnName(`primaryKey;index`), Equals, ``)
	c.Assert(GetGormColumnName(`column:db;primaryKey;index`), Equals, `db`)
}
