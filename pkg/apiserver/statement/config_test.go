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

package statement

import (
	"testing"

	. "github.com/pingcap/check"
)

func TestT(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testConfigSuite{})

type testConfigSuite struct{}

type testConfig struct {
	Enable          bool `json:"enable" gorm:"column:tidb_enable_stmt_summary"`
	RefreshInterval int  `json:"refresh_interval" gorm:"column:tidb_stmt_summary_refresh_interval"`
}

func (t *testConfigSuite) Test_buildGlobalConfigProjectionSelectSQL_struct_success(c *C) {
	testConfigStmt := "SELECT @@GLOBAL.tidb_enable_stmt_summary AS tidb_enable_stmt_summary, @@GLOBAL.tidb_stmt_summary_refresh_interval AS tidb_stmt_summary_refresh_interval"
	c.Assert(buildGlobalConfigProjectionSelectSQL(testConfig{}), Equals, testConfigStmt)
}

func (t *testConfigSuite) Test_buildGlobalConfigProjectionSelectSQL_ptr_success(c *C) {
	testConfigStmt := "SELECT @@GLOBAL.tidb_enable_stmt_summary AS tidb_enable_stmt_summary, @@GLOBAL.tidb_stmt_summary_refresh_interval AS tidb_stmt_summary_refresh_interval"
	c.Assert(buildGlobalConfigProjectionSelectSQL(&testConfig{}), Equals, testConfigStmt)
}

type testConfig2 struct {
	Enable          bool `json:"enable" gorm:"column:tidb_enable_stmt_summary"`
	RefreshInterval int  `json:"refresh_interval"`
}

func (t *testConfigSuite) Test_buildGlobalConfigProjectionSelectSQL_without_gorm_tag(c *C) {
	testConfigStmt := "SELECT @@GLOBAL.tidb_enable_stmt_summary AS tidb_enable_stmt_summary"
	c.Assert(buildGlobalConfigProjectionSelectSQL(&testConfig2{}), Equals, testConfigStmt)
}

func (t *testConfigSuite) Test_buildGlobalConfigNamedArgsUpdateSQL_struct_success(c *C) {
	testConfigStmt := "SET @@GLOBAL.tidb_enable_stmt_summary = @Enable, @@GLOBAL.tidb_stmt_summary_refresh_interval = @RefreshInterval"
	c.Assert(buildGlobalConfigNamedArgsUpdateSQL(testConfig{Enable: true, RefreshInterval: 1800}), Equals, testConfigStmt)
}

func (t *testConfigSuite) Test_buildGlobalConfigNamedArgsUpdateSQL_ptr_success(c *C) {
	testConfigStmt := "SET @@GLOBAL.tidb_enable_stmt_summary = @Enable, @@GLOBAL.tidb_stmt_summary_refresh_interval = @RefreshInterval"
	c.Assert(buildGlobalConfigNamedArgsUpdateSQL(&testConfig{Enable: true, RefreshInterval: 1800}), Equals, testConfigStmt)
}

func (t *testConfigSuite) Test_buildGlobalConfigNamedArgsUpdateSQL_without_gorm_tag(c *C) {
	testConfigStmt := "SET @@GLOBAL.tidb_enable_stmt_summary = @Enable"
	c.Assert(buildGlobalConfigNamedArgsUpdateSQL(&testConfig2{Enable: true, RefreshInterval: 1800}), Equals, testConfigStmt)
}

func (t *testConfigSuite) Test_buildGlobalConfigNamedArgsUpdateSQL_extract_fields(c *C) {
	testConfigStmt := "SET @@GLOBAL.tidb_enable_stmt_summary = @Enable"
	c.Assert(buildGlobalConfigNamedArgsUpdateSQL(&testConfig{Enable: true, RefreshInterval: 1800}, "Enable"), Equals, testConfigStmt)
}
