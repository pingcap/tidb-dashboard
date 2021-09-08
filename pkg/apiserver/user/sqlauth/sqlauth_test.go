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

package sqlauth

import (
	"testing"

	. "github.com/pingcap/check"
)

func TestT(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testSQLAuthSuite{})

type testSQLAuthSuite struct{}

func (t *testSQLAuthSuite) Test_parseUserGrants(c *C) {
	cases := []struct {
		desc     string
		input    []string
		expected map[string]struct{}
	}{
		// 0
		{
			desc: "all privileges",
			input: []string{
				"GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION",
			},
			expected: map[string]struct{}{
				"ALL PRIVILEGES": {},
			},
		},
		// 1
		{
			desc: "table privileges",
			input: []string{
				"GRANT SELECT,INSERT ON mysql.* TO 'dashboardAdmin'@'%'",
			},
			expected: map[string]struct{}{
				"SELECT": {},
				"INSERT": {},
			},
		},
		// 2
		{
			desc: "global privileges",
			input: []string{
				"GRANT PROCESS,SHOW DATABASES,CONFIG ON *.* TO 'dashboardAdmin'@'%'",
				"GRANT SYSTEM_VARIABLES_ADMIN ON *.* TO 'dashboardAdmin'@'%'",
			},
			expected: map[string]struct{}{
				"PROCESS":                {},
				"SHOW DATABASES":         {},
				"CONFIG":                 {},
				"SYSTEM_VARIABLES_ADMIN": {},
			},
		},
		// 3
		{
			desc: "role privileges",
			input: []string{
				"GRANT `app_read`@`%` TO `test`@`%`",
			},
			expected: map[string]struct{}{},
		},
	}

	for i, v := range cases {
		actual := parseUserGrants(v.input)
		c.Assert(actual, DeepEquals, v.expected, Commentf("parse %s (index: %d) failed", v.desc, i))
	}
}

func (t *testSQLAuthSuite) Test_checkDashboardPriv(c *C) {
	cases := []struct {
		desc      string
		grants    []string
		enableSEM bool
		expected  bool
	}{
		// 0
		{
			desc:      "all privileges with enableSEM false",
			grants:    []string{"ALL PRIVILEGES"},
			enableSEM: false,
			expected:  true,
		},
		// 1
		{
			desc:      "all privileges with enableSEM true",
			grants:    []string{"ALL PRIVILEGES"},
			enableSEM: true,
			expected:  false,
		},
		// 2
		{
			desc:      "super privileges with enableSEM false",
			grants:    []string{"PROCESS", "SHOW DATABASES", "CONFIG", "SUPER"},
			enableSEM: false,
			expected:  true,
		},
		// 3
		{
			desc:      "super privileges with enableSEM true",
			grants:    []string{"PROCESS", "SHOW DATABASES", "CONFIG", "SUPER"},
			enableSEM: true,
			expected:  false,
		},
		// 4
		{
			desc:      "base privileges with enableSEM false",
			grants:    []string{"PROCESS", "SHOW DATABASES", "CONFIG", "DASHBOARD_CLIENT"},
			enableSEM: false,
			expected:  true,
		},
		// 5
		{
			desc:      "base privileges with enableSEM true",
			grants:    []string{"PROCESS", "SHOW DATABASES", "CONFIG", "DASHBOARD_CLIENT"},
			enableSEM: true,
			expected:  false,
		},
		// 6
		{
			desc:      "lack PROCESS privilege",
			grants:    []string{"SHOW DATABASES", "CONFIG", "DASHBOARD_CLIENT"},
			enableSEM: false,
			expected:  false,
		},
		// 7
		{
			desc:      "lack DASHBOARD_CLIENT privilege",
			grants:    []string{"PROCESS", "SHOW DATABASES", "CONFIG"},
			enableSEM: false,
			expected:  false,
		},
		// 8
		{
			desc:      "extra privileges",
			grants:    []string{"PROCESS", "SHOW DATABASES", "CONFIG", "DASHBOARD_CLIENT", "RESTRICTED_VARIABLES_ADMIN", "RESTRICTED_TABLES_ADMIN", "RESTRICTED_TABLES_ADMIN"},
			enableSEM: true,
			expected:  true,
		},
		// 9
		{
			desc:      "lack RESTRICTED_VARIABLES_ADMIN extra privileges",
			grants:    []string{"PROCESS", "SHOW DATABASES", "CONFIG", "DASHBOARD_CLIENT", "RESTRICTED_TABLES_ADMIN", "RESTRICTED_TABLES_ADMIN"},
			enableSEM: true,
			expected:  false,
		},
	}
	for i, v := range cases {
		grants := map[string]struct{}{}
		for _, grant := range v.grants {
			grants[grant] = struct{}{}
		}
		actual := checkDashboardPriv(grants, v.enableSEM)
		c.Assert(actual, DeepEquals, v.expected, Commentf("check %s (index: %d) failed", v.desc, i))
	}
}

func (t *testSQLAuthSuite) Test_checkWriteablePriv(c *C) {
	cases := []struct {
		desc     string
		grants   []string
		expected bool
	}{
		// 0
		{
			desc: "ALL privileges",
			grants: []string{
				"ALL PRIVILEGES",
			},
			expected: true,
		},
		// 1
		{
			desc: "SUPER privileges",
			grants: []string{
				"SUPER",
			},
			expected: true,
		},
		// 2
		{
			desc: "SYSTEM_VARIABLES_ADMIN privileges",
			grants: []string{
				"SYSTEM_VARIABLES_ADMIN",
			},
			expected: true,
		},
		// 3
		{
			desc: "all privileges",
			grants: []string{
				"ALL PRIVILEGES", "SUPER", "SYSTEM_VARIABLES_ADMIN",
			},
			expected: true,
		},
		// 4
		{
			desc: "other privileges",
			grants: []string{
				"PROCESS", "CONFIG",
			},
			expected: false,
		},
	}

	for i, v := range cases {
		grants := map[string]struct{}{}
		for _, grant := range v.grants {
			grants[grant] = struct{}{}
		}
		actual := checkWriteablePriv(grants)
		c.Assert(actual, DeepEquals, v.expected, Commentf("check %s (index: %d) failed", v.desc, i))
	}
}
