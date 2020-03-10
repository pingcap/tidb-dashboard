package inspection

import (
	"testing"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jinzhu/gorm"
	. "github.com/pingcap/check"
)

func TestT(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testInspectionSuite{})

type testInspectionSuite struct{}

func (t *testInspectionSuite) TestInspection(c *C) {
	cli, err := gorm.Open("mysql", "root:@tcp(172.16.5.40:4009)/test?charset=utf8&parseTime=True&loc=Local")
	c.Assert(err, IsNil)
	defer cli.Close()

	// affect by big query join
	//startTime1 := "2020-03-08 01:36:00"
	//endTime1 := "2020-03-08 01:41:00"
	//
	//startTime2 := "2020-03-08 01:46:30"
	//endTime2 := "2020-03-08 01:51:30"

	// affect by big write with conflict
	//startTime1 := "2020-03-10 12:35:00"
	//endTime1 := "2020-03-10 12:39:00"
	//
	//startTime2 := "2020-03-10 12:41:00"
	//endTime2 := "2020-03-10 12:45:00"

	// affect by big write without conflict
	//startTime1 := "	2020-03-10 13:20:00"
	//endTime1 := "	2020-03-10 13:23:00"
	//
	//startTime2 := "2020-03-10 13:24:00"
	//endTime2 := "2020-03-10 13:27:00"

	// diagnose for server down
	//startTime1 := "2020-03-09 20:35:00"
	//endTime1 := "2020-03-09 21:20:00"
	//startTime2 := "2020-03-08 20:35:00"
	//endTime2 := "2020-03-09 21:20:00"

	// diagnose for disk slow , need more disk metric.
	startTime1 := "2020-03-10 12:48:00"
	endTime1 := "2020-03-10 12:50:00"

	startTime2 := "2020-03-10 12:54:30"
	endTime2 := "2020-03-10 12:56:30"




	is := &clusterInspection{
		referStartTime: startTime1,
		referEndTime:   endTime1,

		startTime: startTime2,
		endTime:   endTime2,
		db:        cli,
	}

	_,err = is.diagnoseServerDown()
	c.Assert(err, IsNil)
	_,err = is.diagnoseTiKVServerDown()
	c.Assert(err, IsNil)
	_, err = is.inspectForAffectByBigQuery()
	c.Assert(err, IsNil)
}
