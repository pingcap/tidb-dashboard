// Copyright 2020 PingCAP, Inc.
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

package diagnose

import (
	"fmt"
	"strings"
	"testing"

	"github.com/jinzhu/gorm"
	. "github.com/pingcap/check"
)

func TestT(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testReportSuite{})

type testReportSuite struct{}

func (t *testReportSuite) TestReport(c *C) {
	cli, err := gorm.Open("mysql", "root:@tcp(127.0.0.1:4000)/test?charset=utf8&parseTime=True&loc=Local")
	c.Assert(err, IsNil)
	defer cli.Close()

	startTime := "2020-02-27 19:20:23"
	endTime := "2020-02-27 21:20:23"

	tables := GetReportTablesForDisplay(startTime, endTime, cli)
	for _, tbl := range tables {
		printRows(tbl)
	}
}

func (t *testReportSuite) TestGetTable(c *C) {
	cli, err := gorm.Open("mysql", "root:@tcp(172.16.5.40:4009)/test?charset=utf8&parseTime=True&loc=Local")
	c.Assert(err, IsNil)
	defer cli.Close()

	startTime := "2020-02-27 20:00:00"
	endTime := "2020-02-27 21:00:00"

	var table *TableDef
	table, err = GetClusterHardwareInfoTable(startTime, endTime, cli)
	c.Assert(err, IsNil)
	printRows(table)
}

func (t *testReportSuite) TestRoundFloatString(c *C) {
	cases := []struct {
		in  string
		out string
	}{
		{"0", "0"},
		{"1", "1"},
		{"0.8", "0.8"},
		{"0.99", "0.99"},
		{"1.12345", "1.12"},
		{"1.1256", "1.13"},
		{"12345678.1256", "12345678.13"},
		{"0.1256", "0.13"},
		{"0.00234", "0.002"},
		{"0.00254", "0.003"},
		{"0.000000056", "0.00000006"},
		{"0.00000000000000054", "0.0000000000000005"},
		{"0.00000000000000056", "0.0000000000000006"},
		{"65.20832000000001", "65.21"},
	}
	for _, cas := range cases {
		result := RoundFloatString(cas.in)
		c.Assert(result, Equals, cas.out)
	}
}

func printRows(t *TableDef) {
	if t == nil {
		fmt.Println("table is nil")
		return
	}

	if len(t.Rows) == 0 {
		fmt.Println("table rows is 0")
		return
	}

	fieldLen := t.ColumnWidth()
	//fmt.Println(fieldLen)
	printLine := func(values []string, comment string) {
		line := ""
		for i, s := range values {
			for k := len(s); k < fieldLen[i]; k++ {
				s += " "
			}
			if i > 0 {
				line += "    |    "
			}
			line += s
		}
		if len(comment) != 0 {
			line = line + "    |    " + comment
		}
		fmt.Println(line)
	}

	fmt.Println(strings.Join(t.Category, " - "))
	fmt.Println(t.Title)
	fmt.Println(t.CommentEN)
	printLine(t.Column, "")

	for _, row := range t.Rows {
		printLine(row.Values, row.Comment)
		for i := range row.SubValues {
			printLine(row.SubValues[i], "")
		}
	}
	fmt.Println("")
}
