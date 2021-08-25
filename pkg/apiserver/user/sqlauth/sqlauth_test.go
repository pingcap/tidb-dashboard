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

func (t *testSQLAuthSuite) Test_parseGrants(c *C) {
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
