// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package diagnose

import (
	"testing"

	"github.com/pingcap/check"
)

func TestT(t *testing.T) {
	check.CustomVerboseFlag = true
	check.TestingT(t)
}

var _ = check.Suite(&testReportSuite{})

type testReportSuite struct{}

func (t *testReportSuite) TestCompareTable(c *check.C) {
	table1 := TableDef{
		Category:       []string{"header"},
		Title:          "test",
		joinColumns:    []int{1},
		compareColumns: []int{2},
		Column:         []string{"c1", "c2", "c3"},
		Rows:           nil,
	}

	cases := []struct {
		rows1 []TableRowDef
		rows2 []TableRowDef
		out   []TableRowDef
	}{
		{
			rows1: nil,
			rows2: nil,
			out:   []TableRowDef{},
		},
		{
			rows1: []TableRowDef{
				{Values: []string{"0", "0", "0"}},
			},
			rows2: nil,
			out: []TableRowDef{
				{Values: []string{"0", "0", "0", "", "", "1"}},
			},
		},
		{
			rows1: []TableRowDef{
				{Values: []string{"0", "0", "0"}},
			},
			rows2: []TableRowDef{
				{Values: []string{"1", "1", "1"}},
			},
			out: []TableRowDef{
				{Values: []string{"0", "0", "0", "", "", "1"}},
				{Values: []string{"", "1", "", "1", "1", "1"}},
			},
		},
		{
			rows1: []TableRowDef{
				{Values: []string{"0", "0", "0"}},
			},
			rows2: []TableRowDef{
				{Values: []string{"1", "0", "0"}},
			},
			out: []TableRowDef{
				{Values: []string{"0", "0", "0", "1", "0", "0"}},
			},
		},
		{
			rows1: []TableRowDef{
				{Values: []string{"0", "0", "0"}},
			},
			rows2: []TableRowDef{
				{Values: []string{"1", "0", "1"}},
			},
			out: []TableRowDef{
				{Values: []string{"0", "0", "0", "1", "1", "1"}},
			},
		},
	}

	dr := &diffRows{}
	for _, cas := range cases {
		t1 := table1
		t2 := table1
		t1.Rows = cas.rows1
		t2.Rows = cas.rows2
		t, err := compareTable(&t1, &t2, dr)
		c.Assert(err, check.IsNil)
		c.Assert(len(t.Rows), check.Equals, len(cas.out))
		for i, row := range t.Rows {
			c.Assert(row.Values, check.DeepEquals, cas.out[i].Values)
			c.Assert(len(row.SubValues), check.Equals, len(cas.out[i].SubValues))
			for j, subRow := range cas.out[i].SubValues {
				c.Assert(subRow, check.DeepEquals, row.SubValues[j])
			}
		}
	}
}

func (t *testReportSuite) TestRoundFloatString(c *check.C) {
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
		c.Assert(result, check.Equals, cas.out)
	}
}
