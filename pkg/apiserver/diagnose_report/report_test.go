package diagnose_report_test

import (
	"database/sql"
	"fmt"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/diagnose_report"
	. "github.com/pingcap/check"
	"testing"
)

func TestT(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testReportSuite{})

type testReportSuite struct{}

func (t *testReportSuite) TestReport(c *C) {
	//cli := t.getDBCli(c, "", "127.0.0.1:4000", "test")
	////startTime := "2020-02-23 10:55:00"
	////endTime := "2020-02-23 11:05:00"
	//
	//startTime := "2020-02-25 13:20:23"
	//endTime := "2020-02-26 13:30:23"
	//
	//tables, errs := diagnose_report.GetReportTables(startTime, endTime, cli)
	//for _, tbl := range tables {
	//	printRows(tbl)
	//}
	//c.Assert(errs, HasLen, 0)
}

func (t *testReportSuite) getDBCli(c *C, passwd, addr, dbName string) *sql.DB {
	dbDSN := fmt.Sprintf("root:%s@tcp(%s)/%s", passwd, addr, dbName)
	db, err := sql.Open("mysql", dbDSN)
	c.Assert(err, IsNil)
	db.SetMaxOpenConns(1)
	return db
}

func (t *testReportSuite) TestGetTable(c *C) {
	cli := t.getDBCli(c, "", "172.16.5.40:4009", "test")
	//cli := t.getDBCli(c, "", "127.0.0.1:4000", "test")
	//startTime := "2020-02-23 10:55:00"
	//endTime := "2020-02-23 11:05:00"

	startTime := "2020-02-25 13:20:23"
	endTime := "2020-02-26 13:30:23"

	var table *diagnose_report.TableDef
	var err error
	//table, err = diagnose_report.GetTiKVTotalTimeConsumeTable(startTime, endTime, cli)
	//c.Assert(err, IsNil)
	//printRows(table)
	//
	table, err = diagnose_report.GetTiDBGCConfigInfo(startTime, endTime, cli)
	c.Assert(err, IsNil)
	printRows(table)

	table, err = diagnose_report.GetTiKVCopInfo(startTime, endTime, cli)
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
		result := diagnose_report.RoundFloatString(cas.in)
		c.Assert(result, Equals, cas.out)
	}
}

func printRows(t *diagnose_report.TableDef) {
	if t == nil {
		fmt.Println("table is nil")
		return
	}
	fmt.Println(t.CommentEN)

	if len(t.Rows) == 0 {
		fmt.Println("table rows is 0")
		return
	}

	fieldLen := t.ColumnWidth()
	//fmt.Println(fieldLen)
	printLine := func(values []string) {
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
		fmt.Println(line)
	}

	fmt.Println(t.Title)
	printLine(t.Column)

	for _, row := range t.Rows {
		printLine(row.Values)
		for i := range row.SubValues {
			printLine(row.SubValues[i])
		}
	}
	fmt.Println("")
}
