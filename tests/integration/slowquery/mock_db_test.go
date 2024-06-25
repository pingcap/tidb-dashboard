// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package slowquery

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/slowquery"
	"github.com/pingcap/tidb-dashboard/pkg/utils"
	"github.com/pingcap/tidb-dashboard/tests/util"
	"github.com/pingcap/tidb-dashboard/util/testutil"
)

const (
	TestSlowQueryTableName = "test.CLUSTER_SLOW_QUERY"
)

type testMockDBSuite struct {
	suite.Suite
	db        *testutil.TestDB
	sysSchema *utils.SysSchema
}

func TestMockDBSuite(t *testing.T) {
	db := testutil.OpenTestDB(t)
	sysSchema := utils.NewSysSchema()

	suite.Run(t, &testMockDBSuite{
		db:        db,
		sysSchema: sysSchema,
	})
}

func (s *testMockDBSuite) SetupSuite() {
	util.LoadFixtures(s.T(), s.db, "../../fixtures")
}

func (s *testMockDBSuite) TearDownSuite() {
	s.db.MustExec(fmt.Sprintf("DROP TABLE IF EXISTS `%s`", TestSlowQueryTableName))
	s.db.MustClose()
	_ = s.sysSchema.Close()
}

func (s *testMockDBSuite) mustQuerySlowLogList(req *slowquery.GetListRequest) []slowquery.Model {
	d, err := slowquery.QuerySlowLogList(req, s.sysSchema, s.mockDBSession())
	s.Require().NoError(err)
	return d
}

func (s *testMockDBSuite) mustQuerySlowLogDetail(req *slowquery.GetDetailRequest) (*slowquery.Model, error) {
	d, err := slowquery.QuerySlowLogDetail(req, s.sysSchema, s.mockDBSession())
	return d, err
}

func (s *testMockDBSuite) mockDBSession() *gorm.DB {
	return s.db.Gorm().Debug().Table(TestSlowQueryTableName)
}

func (s *testMockDBSuite) TestGetListDefaultRequest() {
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{})

	s.Require().Len(ds, 9)

	for i, d := range ds {
		s.Require().NotEmpty(d.Digest)
		s.Require().NotEmpty(d.ConnectionID)
		s.Require().NotEmpty(d.Timestamp)

		// order by timestamp
		if i == 0 {
			continue
		}
		s.Require().GreaterOrEqual(d.Timestamp, ds[i-1].Timestamp)
	}
}

func (s *testMockDBSuite) TestGetListSpecificFieldsRequest() {
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "digest,query"})

	for _, d := range ds {
		s.Require().NotEmpty(d.Digest)
		s.Require().NotEmpty(d.ConnectionID)
		s.Require().NotEmpty(d.Timestamp)
		s.Require().NotEmpty(d.Query)
	}
}

// Contains fields available for all tidb versions, other fields will be tested in compatibility_test.go.
func (s *testMockDBSuite) TestGetListAllFieldsRequest() {
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Digest: "TEST_ALL_FIELDS", Fields: "*"})
	s.Require().Len(ds, 1)

	d := ds[0]
	s.Require().NotEmpty(d.BackoffTime)
	s.Require().NotEmpty(d.BackoffTypes)
	s.Require().NotEmpty(d.CommitBackoffTime)
	s.Require().NotEmpty(d.CommitTime)
	s.Require().NotEmpty(d.CompileTime)
	s.Require().NotEmpty(d.ConnectionID)
	s.Require().NotEmpty(d.CopProcAddr)
	s.Require().NotEmpty(d.CopProcAvg)
	s.Require().NotEmpty(d.CopProcMax)
	s.Require().NotEmpty(d.CopProcP90)
	s.Require().NotEmpty(d.CopTime)
	s.Require().NotEmpty(d.CopWaitAddr)
	s.Require().NotEmpty(d.CopWaitAvg)
	s.Require().NotEmpty(d.CopWaitMax)
	s.Require().NotEmpty(d.CopWaitP90)
	s.Require().NotEmpty(d.DB)
	s.Require().NotEmpty(d.Digest)
	s.Require().NotEmpty(d.GetCommitTSTime)
	s.Require().NotEmpty(d.Host)
	s.Require().NotEmpty(d.IndexNames)
	s.Require().NotEmpty(d.Instance)
	s.Require().NotEmpty(d.IsInternal)
	s.Require().NotEmpty(d.LocalLatchWaitTime)
	s.Require().NotEmpty(d.LockKeysTime)
	s.Require().NotEmpty(d.MemoryMax)
	s.Require().NotEmpty(d.ParseTime)
	s.Require().NotEmpty(d.Plan)
	s.Require().NotEmpty(d.PrevStmt)
	s.Require().NotEmpty(d.PrewriteRegion)
	s.Require().NotEmpty(d.PrewriteTime)
	s.Require().NotEmpty(d.ProcessKeys)
	s.Require().NotEmpty(d.ProcessTime)
	s.Require().NotEmpty(d.Query)
	s.Require().NotEmpty(d.QueryTime)
	s.Require().NotEmpty(d.RequestCount)
	s.Require().NotEmpty(d.Stats)
	s.Require().NotEmpty(d.Success)
	s.Require().NotEmpty(d.Timestamp)
	s.Require().NotEmpty(d.TotalKeys)
	s.Require().NotEmpty(d.TxnRetry)
	s.Require().NotEmpty(d.User)
	s.Require().NotEmpty(d.WaitPreWriteBinlogTime)
	s.Require().NotEmpty(d.WaitTime)
	s.Require().NotEmpty(d.WriteKeys)
	s.Require().NotEmpty(d.WriteSize)
}

func (s *testMockDBSuite) TestGetListTimeRangeRequest() {
	// 1639928730 - 2021-12-19T23:45:30+08:00
	// 1639928987 - 2021-12-19T23:49:48+08:00
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{BeginTime: 1639928730, EndTime: 1639928988})

	s.Require().Len(ds, 8)
}

func (s *testMockDBSuite) TestGetListLimitRequest() {
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Limit: 5})

	s.Require().Len(ds, 5)
}

func (s *testMockDBSuite) TestGetListSearchRequest() {
	digest := "2375da6810d9c5a0d1c84875b1376bfd469ad952c1884f5dc1d6f36fc953b5df"
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "digest", Text: digest})
	s.Require().Len(ds, 4)
	for _, d := range ds {
		s.Require().Contains(d.Digest, digest)
	}

	txnStartTS := "429897544566046725"
	ds2 := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "txn_start_ts", Text: txnStartTS})
	s.Require().Len(ds2, 1)
	s.Require().Contains(ds2[0].TxnStartTS, txnStartTS)

	query := "INFORMATION_SCHEMA.CLUSTER_SLOW_QUERY"
	ds3 := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "query", Text: query})
	s.Require().Len(ds3, 4)
	for _, d := range ds3 {
		s.Require().Contains(d.Query, query)
	}

	prevStmt := "test prev stmt"
	ds4 := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "prev_stmt", Text: prevStmt})
	s.Require().Len(ds4, 1)
	s.Require().Contains(ds4[0].PrevStmt, prevStmt)
}

func (s *testMockDBSuite) TestGetListMultiKeywordsSearchRequest() {
	digest := "2375da6810d9c5a0d1c84875b1376bfd469ad952c1884f5dc1d6f36fc953b5df"
	txnStartTS := "429897544566046725"
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "digest,txn_start_ts", Text: fmt.Sprintf("%s %s", digest, txnStartTS)})

	s.Require().Len(ds, 1)
	s.Require().Contains(ds[0].Digest, digest)
	s.Require().Contains(ds[0].TxnStartTS, txnStartTS)
}

func (s *testMockDBSuite) TestGetListUseDBRequest() {
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{DB: []string{"test"}})
	s.Require().NotEmpty(ds)

	ds2 := s.mustQuerySlowLogList(&slowquery.GetListRequest{DB: []string{"not_exist_db"}})
	s.Require().Empty(ds2)
}

func (s *testMockDBSuite) TestGetListOrderRequest() {
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{OrderBy: "txn_start_ts"})
	for i, d := range ds {
		if i == 0 {
			continue
		}
		s.Require().GreaterOrEqual(d.TxnStartTS, ds[i-1].TxnStartTS)
	}

	ds2 := s.mustQuerySlowLogList(&slowquery.GetListRequest{IsDesc: true, OrderBy: "txn_start_ts"})
	for i, d := range ds2 {
		if i == 0 {
			continue
		}
		s.Require().LessOrEqual(d.TxnStartTS, ds[i-1].TxnStartTS)
	}
}

func (s *testMockDBSuite) TestGetListPlansRequest() {
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Plans: []string{"a5e33155313418557311d13039dbf20aa54df3b825d062bdca92f1a271e5778a"}})
	s.Require().NotEmpty(ds)

	ds2 := s.mustQuerySlowLogList(&slowquery.GetListRequest{Plans: []string{"not_exist_plan"}})
	s.Require().Empty(ds2)
}

func (s *testMockDBSuite) TestGetListAllRequest() {
	digest := "2375da6810d9c5a0d1c84875b1376bfd469ad952c1884f5dc1d6f36fc953b5df"
	txnStartTS := "429897544566046725"
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{
		BeginTime: 1639928730,
		EndTime:   1639928988,
		Limit:     5,
		IsDesc:    true,
		OrderBy:   "txn_start_ts",
		DB:        []string{"test"},
		Fields:    "digest,txn_start_ts",
		Text:      fmt.Sprintf("%s %s", digest, txnStartTS),
	})

	s.Require().NotEmpty(ds)
	s.Require().LessOrEqual(len(ds), 5)
	s.Require().Contains(ds[0].Digest, digest)
	s.Require().Contains(ds[0].TxnStartTS, txnStartTS)

	ds2 := s.mustQuerySlowLogList(&slowquery.GetListRequest{
		BeginTime: 1639928730,
		EndTime:   1639928988,
		Limit:     5,
		IsDesc:    true,
		OrderBy:   "timestamp",
		DB:        []string{},
		Fields:    "query,timestamp,query_time,memory_max,digest",
		Digest:    digest,
		Plans:     []string{"a5e33155313418557311d13039dbf20aa54df3b825d062bdca92f1a271e5778a"},
	})

	s.Require().NotEmpty(ds2)
	s.Require().LessOrEqual(len(ds2), 5)
	s.Require().Contains(ds2[0].Digest, digest)
}

func (s *testMockDBSuite) TestGetDetailRequest() {
	ds, err := s.mustQuerySlowLogDetail(&slowquery.GetDetailRequest{
		Digest:    "2375da6810d9c5a0d1c84875b1376bfd469ad952c1884f5dc1d6f36fc953b5df",
		Timestamp: 1639928730,
		ConnectID: "0",
	})
	s.Require().Error(err)
	s.Require().Nil(ds)
	s.Require().Contains(err.Error(), "record not found")

	ds2, err := s.mustQuerySlowLogDetail(&slowquery.GetDetailRequest{
		Digest:    "2375da6810d9c5a0d1c84875b1376bfd469ad952c1884f5dc1d6f36fc953b5df",
		Timestamp: 1639928987.802016,
		ConnectID: "7",
	})
	s.Require().Nil(err)
	s.Require().NotNil(ds2)
	s.Require().Equal(ds2.Timestamp, 1639928987.802016)
	s.Require().Equal(ds2.Digest, "2375da6810d9c5a0d1c84875b1376bfd469ad952c1884f5dc1d6f36fc953b5df")
	s.Require().Equal(ds2.ConnectionID, "7")
}
