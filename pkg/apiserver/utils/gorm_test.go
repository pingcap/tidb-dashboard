// Copyright 2021 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

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
