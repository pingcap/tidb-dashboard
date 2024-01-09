// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

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
