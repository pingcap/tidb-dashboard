// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package integration

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

// func (t *testReportSuite) TestReport(c *C) {
//	cli, err := gorm.Open("mysql", "root:@tcp(172.16.5.40:4009)/test?charset=utf8&parseTime=True&loc=Local")
//	c.Assert(err, IsNil)
//	defer cli.Close()
//
//	startTime := "2020-03-03 17:18:00"
//	endTime := "2020-03-03 17:21:00"
//
//	tables := GetReportTablesForDisplay(startTime, endTime, cli)
//	for _, tbl := range tables {
//		printRows(tbl)
//	}
// }

// func (t *testReportSuite) TestGetTable(c *C) {
// 	cli, err := gorm.Open(mysql.Open("root:@tcp(172.16.5.40:4009)/test?charset=utf8&parseTime=True&loc=Local"))
// 	c.Assert(err, IsNil)

// 	startTime := "2020-03-25 23:00:00"
// 	endTime := "2020-03-25 23:05:00"

// 	var table diagnose.TableDef
// 	table, err = diagnose.GetLoadTable(startTime, endTime, cli)
// 	c.Assert(err, IsNil)
// 	printRows(&table)
// }

// func (t *testReportSuite) TestGetCompareTable(c *C) {
// 	cli, err := gorm.Open(mysql.Open("root:@tcp(172.16.5.40:4009)/test?charset=utf8&parseTime=True&loc=Local"))
// 	c.Assert(err, IsNil)

// 	//startTime1 := "2020-03-12 20:17:00"
// 	//endTime1 := "2020-03-12 20:39:00"
// 	//
// 	//startTime2 := "2020-03-12 20:17:00"
// 	//endTime2 := "2020-03-12 20:39:00"

// 	startTime1 := "2020-04-02 12:13:00"
// 	endTime1 := "2020-04-02 12:15:00"

// 	startTime2 := "2020-04-02 12:15:00"
// 	endTime2 := "2020-04-02 12:17:00"

// 	tables := diagnose.GetCompareReportTablesForDisplay(startTime1, endTime1, startTime2, endTime2, cli, nil, "ID")
// 	for _, tbl := range tables {
// 		printRows(tbl)
// 	}
// }

// func (t *testReportSuite) TestInspection(c *C) {
// 	cli, err := gorm.Open(mysql.Open("root:@tcp(172.16.5.40:4009)/test?charset=utf8&parseTime=True&loc=Local"))
// 	c.Assert(err, IsNil)

// 	// affect by big query join
// 	startTime1 := "2020-03-08 01:36:00"
// 	endTime1 := "2020-03-08 01:41:00"

// 	startTime2 := "2020-03-08 01:46:30"
// 	endTime2 := "2020-03-08 01:51:30"

// 	// affect by big write with conflict
// 	//startTime1 := "2020-03-10 12:35:00"
// 	//endTime1 := "2020-03-10 12:39:00"
// 	//
// 	//startTime2 := "2020-03-10 12:41:00"
// 	//endTime2 := "2020-03-10 12:45:00"

// 	// affect by big write without conflict
// 	//startTime1 := "	2020-03-10 13:20:00"
// 	//endTime1 := "	2020-03-10 13:23:00"
// 	//
// 	//startTime2 := "2020-03-10 13:24:00"
// 	//endTime2 := "2020-03-10 13:27:00"

// 	// diagnose for server down
// 	// startTime1 := "2020-03-09 20:35:00"
// 	// endTime1 := "2020-03-09 21:20:00"
// 	// startTime2 := "2020-03-08 20:35:00"
// 	// endTime2 := "2020-03-09 21:20:00"

// 	// diagnose for disk slow , need more disk metric.
// 	//startTime1 := "2020-03-10 12:48:00"
// 	//endTime1 := "2020-03-10 12:50:00"
// 	//
// 	//startTime2 := "2020-03-10 12:54:30"
// 	//endTime2 := "2020-03-10 12:56:30"

// 	table, errRow := diagnose.CompareDiagnose(startTime1, endTime1, startTime2, endTime2, cli)
// 	c.Assert(errRow, IsNil)
// 	printRows(&table)
// }

// func printRows(t *diagnose.TableDef) {
// 	if t == nil {
// 		fmt.Println("table is nil")
// 		return
// 	}

// 	fmt.Println(strings.Join(t.Category, " - "))
// 	fmt.Println(t.Title)
// 	fmt.Println(t.Comment)
// 	if len(t.Rows) == 0 {
// 		fmt.Println("table rows is 0")
// 		return
// 	}

// 	fieldLen := t.ColumnWidth()
// 	// fmt.Println(fieldLen)
// 	printLine := func(values []string, comment string) {
// 		line := ""
// 		for i, s := range values {
// 			for k := len(s); k < fieldLen[i]; k++ {
// 				s += " "
// 			}
// 			if i > 0 {
// 				line += "    |    "
// 			}
// 			line += s
// 		}
// 		if len(comment) != 0 {
// 			line = line + "    |    " + comment
// 		}
// 		fmt.Println(line)
// 	}

// 	printLine(t.Column, "")

// 	for _, row := range t.Rows {
// 		printLine(row.Values, row.Comment)
// 		for i := range row.SubValues {
// 			printLine(row.SubValues[i], "")
// 		}
// 	}
// 	fmt.Println("")
// }
