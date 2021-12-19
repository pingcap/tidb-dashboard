// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package slowquery

import (
	"fmt"
	"os"
	"testing"

	"github.com/shhdgit/testfixtures/v3"
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
	db, err := s.db.Gorm().DB()
	s.Require().NoError(err)

	fixtures, err := testfixtures.New(
		testfixtures.Database(db),
		testfixtures.Dialect("tidb"),
		testfixtures.Directory("../../fixtures"),
	)
	s.Require().NoError(err)

	err = fixtures.Load()
	s.Require().NoError(err)
}

func (s *testMockDBSuite) TearDownSuite() {
	s.db.MustExec(fmt.Sprintf("DROP TABLE IF EXISTS `%s`", TestSlowQueryTableName))
	s.db.MustClose()
}

func (s *testMockDBSuite) mustQuerySlowLogList(req *slowquery.GetListRequest) []slowquery.Model {
	d, err := slowquery.QuerySlowLogList(req, s.sysSchema, s.mockSlowQuerySession())
	s.Require().NoError(err)
	return d
}

func (s *testMockDBSuite) mockSlowQuerySession() *gorm.DB {
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

func (s *testMockDBSuite) TestGetListAllFieldsRequest() {
	if os.Getenv("TIDB_VERSION") != "latest" {
		s.T().Skip("Use latest TiDB to test all fields request")
	}

	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "*"})
	var queryDs []slowquery.Model
	s.mockSlowQuerySession().
		Select("*,(UNIX_TIMESTAMP(Time) + 0E0) as timestamp").
		Limit(100).
		Order("Time").
		Find(&queryDs)

	s.Require().Equal(ds, queryDs)
}

func (s *testMockDBSuite) TestGetListLimitRequest() {
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Limit: 5})

	s.Require().Len(ds, 5)
}

func (s *testMockDBSuite) TestGetListSearchRequest() {
	digest := "2375da6810d9c5a0d1c84875b1376bfd469ad952c1884f5dc1d6f36fc953b5df"
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "*", Text: digest})

	s.Require().NotEmpty(ds)
	for _, d := range ds {
		s.Require().Contains(d.Digest, digest)
	}

	txnStartTS := ds[0].TxnStartTS
	ds2 := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "*", Text: txnStartTS})

	s.Require().NotEmpty(ds2)
	for _, d := range ds2 {
		s.Require().Contains(d.TxnStartTS, txnStartTS)
	}

	query := "INFORMATION_SCHEMA.CLUSTER_SLOW_QUERY"
	ds3 := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "*", Text: query})

	s.Require().NotEmpty(ds3)
	for _, d := range ds3 {
		s.Require().Contains(d.Query, query)
	}

	// TODO: search by Prev_stmt
}

func (s *testMockDBSuite) TestGetListMultiKeywordsSearchRequest() {
	digest := "2375da6810d9c5a0d1c84875b1376bfd469ad952c1884f5dc1d6f36fc953b5df"
	txnStartTS := "429897544566046725"
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "*", Text: fmt.Sprintf("%s %s", digest, txnStartTS)})

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

func (s *testMockDBSuite) TestFieldsCompatibility() {
	if util.CheckTiDBVersion(s.Require(), "< 5.0.0") {
		ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "*"})
		for _, d := range ds {
			s.Require().Empty(d.RocksdbBlockCacheHitCount)
			s.Require().Empty(d.RocksdbBlockReadByte)
			s.Require().Empty(d.RocksdbBlockReadCount)
			s.Require().Empty(d.RocksdbDeleteSkippedCount)
			s.Require().Empty(d.RocksdbKeySkippedCount)
		}
	}

	if util.CheckTiDBVersion(s.Require(), ">= 5.0.0") {
		ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "*"})
		for _, d := range ds {
			s.Require().NotEmpty(d.RocksdbBlockCacheHitCount)
			s.Require().NotEmpty(d.RocksdbBlockReadByte)
			s.Require().NotEmpty(d.RocksdbBlockReadCount)
			s.Require().NotEmpty(d.RocksdbDeleteSkippedCount)
			s.Require().NotEmpty(d.RocksdbKeySkippedCount)
		}
	}
}
