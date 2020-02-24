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

func (t *testReportSuite) getDBCli(c *C, passwd, addr, dbName string) *sql.DB {
	dbDSN := fmt.Sprintf("root:%s@tcp(%s)/%s", passwd, addr, dbName)
	db, err := sql.Open("mysql", dbDSN)
	c.Assert(err, IsNil)
	db.SetMaxOpenConns(1)
	return db
}

func (t *testReportSuite) TestReport(c *C) {
	cli := t.getDBCli(c, "", "127.0.0.1:4000", "test")
	startTime := "2020-02-23 10:55:00"
	endTime := "2020-02-23 11:05:00"
	table, err := diagnose_report.GetTotalTimeTableData(startTime, endTime, cli)
	c.Assert(err, IsNil)
	printRows(table)
}

func printRows(t *diagnose_report.TableDef) {
	if t == nil || len(t.Rows) == 0 {
		return
	}

	fieldLen := t.ColumnWidth()
	fmt.Println(fieldLen)
	for _, row := range t.Rows {
		line := ""
		for i, s := range row.Values {
			for k := len(s); k < fieldLen[i]; k++ {
				s += " "
			}
			if i > 0 {
				line += "    |    "
			}
			line += s
		}
		fmt.Println(line)

		for i := range row.SubValues {
			line := ""
			for j, s := range row.SubValues[i] {
				for k := len(s); k < fieldLen[j]; k++ {
					s += " "
				}
				if j > 0 {
					line += "    |    "
				}
				line += s
			}
			fmt.Println(line)
		}
	}
	fmt.Println("")
}
