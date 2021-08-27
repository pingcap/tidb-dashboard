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

var _ = Suite(&testVerifySQLUserSuite{})

type testVerifySQLUserSuite struct{}

func (t *testVerifySQLUserSuite) Test_parseGrants(c *C) {
	cases := []struct {
		desc     string
		input    []string
		expected []string
	}{
		// 0
		{
			desc: "all privileges",
			input: []string{
				"GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION",
			},
			expected: []string{"ALL PRIVILEGES"},
		},
		// 1
		{
			desc: "table privileges",
			input: []string{
				"GRANT SELECT,INSERT ON mysql.* TO 'dashboardAdmin'@'%'",
			},
			expected: []string{"SELECT", "INSERT"},
		},
		// 2
		{
			desc: "global privileges",
			input: []string{
				"GRANT PROCESS,SHOW DATABASES,CONFIG ON *.* TO 'dashboardAdmin'@'%'",
				"GRANT SYSTEM_VARIABLES_ADMIN ON *.* TO 'dashboardAdmin'@'%'",
			},
			expected: []string{"PROCESS", "SHOW DATABASES", "CONFIG", "SYSTEM_VARIABLES_ADMIN"},
		},
		// 3
		{
			desc: "role privileges",
			input: []string{
				"GRANT `app_read`@`%` TO `test`@`%`",
			},
			expected: []string{},
		},
	}

	for i, v := range cases {
		actual := parseCurUserGrants(v.input)
		c.Assert(actual, DeepEquals, v.expected, Commentf("parse %s (index: %d) failed", v.desc, i))
	}
}

func (t *testSQLAuthSuite) Test_checkDashboardPrivileges(c *C) {
	cases := []struct {
		desc                string
		inputParamGrants    []string
		inputParamEnableSEM bool
		expected            bool
	}{
		// 0
		{
			desc:                "all privileges with enableSEM false",
			inputParamGrants:    []string{"ALL PRIVILEGES"},
			inputParamEnableSEM: false,
			expected:            true,
		},
		// 1
		{
			desc:                "all privileges with enableSEM true",
			inputParamGrants:    []string{"ALL PRIVILEGES"},
			inputParamEnableSEM: true,
			expected:            false,
		},
		// 2
		{
			desc:                "super privileges with enableSEM false",
			inputParamGrants:    []string{"PROCESS", "SHOW DATABASES", "CONFIG", "SUPER"},
			inputParamEnableSEM: false,
			expected:            true,
		},
		// 3
		{
			desc:                "super privileges with enableSEM true",
			inputParamGrants:    []string{"PROCESS", "SHOW DATABASES", "CONFIG", "SUPER"},
			inputParamEnableSEM: true,
			expected:            false,
		},
		// 4
		{
			desc:                "base privileges with enableSEM false",
			inputParamGrants:    []string{"PROCESS", "SHOW DATABASES", "CONFIG", "SYSTEM_VARIABLES_ADMIN", "DASHBOARD_CLIENT"},
			inputParamEnableSEM: false,
			expected:            true,
		},
		// 5
		{
			desc:                "base privileges with enableSEM true",
			inputParamGrants:    []string{"PROCESS", "SHOW DATABASES", "CONFIG", "SYSTEM_VARIABLES_ADMIN", "DASHBOARD_CLIENT"},
			inputParamEnableSEM: true,
			expected:            false,
		},
		// 6
		{
			desc:                "lack PROCESS privilege",
			inputParamGrants:    []string{"SHOW DATABASES", "CONFIG", "SYSTEM_VARIABLES_ADMIN", "DASHBOARD_CLIENT"},
			inputParamEnableSEM: false,
			expected:            false,
		},
		// 7
		{
			desc:                "lack SYSTEM_VARIABLES_ADMIN privilege",
			inputParamGrants:    []string{"PROCESS", "SHOW DATABASES", "CONFIG", "DASHBOARD_CLIENT"},
			inputParamEnableSEM: false,
			expected:            false,
		},
		// 8
		{
			desc:                "extra privileges",
			inputParamGrants:    []string{"PROCESS", "SHOW DATABASES", "CONFIG", "SYSTEM_VARIABLES_ADMIN", "DASHBOARD_CLIENT", "RESTRICTED_VARIABLES_ADMIN", "RESTRICTED_TABLES_ADMIN", "RESTRICTED_TABLES_ADMIN"},
			inputParamEnableSEM: true,
			expected:            true,
		},
		// 9
		{
			desc:                "lack RESTRICTED_VARIABLES_ADMIN extra privileges",
			inputParamGrants:    []string{"PROCESS", "SHOW DATABASES", "CONFIG", "SYSTEM_VARIABLES_ADMIN", "DASHBOARD_CLIENT", "RESTRICTED_TABLES_ADMIN", "RESTRICTED_TABLES_ADMIN"},
			inputParamEnableSEM: true,
			expected:            false,
		},
	}
	for i, v := range cases {
		actual := checkDashboardPrivileges(v.inputParamGrants, v.inputParamEnableSEM)
		c.Assert(actual, DeepEquals, v.expected, Commentf("parse %s (index: %d) failed", v.desc, i))
	}
}
