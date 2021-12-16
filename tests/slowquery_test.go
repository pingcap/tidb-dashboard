// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package tests

import (
	"fmt"
	"sync"
	"testing"

	mysqldriver "github.com/go-sql-driver/mysql"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/slowquery"
	"github.com/pingcap/tidb-dashboard/pkg/utils"
	"github.com/pingcap/tidb-dashboard/util/testutil"
)

const (
	TestSlowQueryTableName = "test.CLUSTER_SLOW_QUERY"
)

func TestSlowQuery(t *testing.T) {
	db := testutil.OpenTestDB(t, func(c1 *mysqldriver.Config, c2 *gorm.Config) {
		// set param sql will be recorded in slow query
		c1.Params = map[string]string{}
	})

	suite.Run(t, &testSlowQuerySuite{
		db: db,
	})
}

type testSlowQuerySuite struct {
	suite.Suite
	db               *testutil.TestDB
	slowqueryColumns []string
}

func (s *testSlowQuerySuite) SetupSuite() {
	s.prepareTable()

	columns, err := utils.NewSysSchema().GetTableColumnNames(s.TableSession(), slowquery.SlowQueryTable)
	s.NoError(err)
	s.slowqueryColumns = columns
}

func (s *testSlowQuerySuite) TearDownSuite() {
	s.db.MustExec("SET tidb_enable_slow_log = true")
	s.db.MustClose()
}

func (s *testSlowQuerySuite) prepareTable() {
	// init dataset
	var c int64
	err := s.TableSession().Count(&c).Error
	s.Nil(err)
	if c == 0 {
		s.db.MustExec("SET tidb_slow_log_threshold = 0")
		var wg sync.WaitGroup
		for i := 1; i < 200; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				s.db.MustExec(fmt.Sprintf("SELECT count(*) FROM %s", slowquery.SlowQueryTable))
			}()
		}
		wg.Wait()
		s.db.MustExec("SET tidb_slow_log_threshold = 200")
	}

	s.db.MustExec("SET tidb_enable_slow_log = false")
}

func (s *testSlowQuerySuite) mustQuerySlowLogList(req *slowquery.GetListRequest) []slowquery.Model {
	d, err := slowquery.QuerySlowLogList(req, s.slowqueryColumns, s.MockTableSession())
	s.NoError(err)
	return d
}

func (s *testSlowQuerySuite) TableSession() *gorm.DB {
	return s.db.Gorm().Debug().Table(slowquery.SlowQueryTable)
}

func (s *testSlowQuerySuite) MockTableSession() *gorm.DB {
	return s.db.Gorm().Debug().Table(TestSlowQueryTableName)
}

func (s *testSlowQuerySuite) TestGetListDefaultRequest() {
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{})

	s.Len(ds, 100)

	for i, d := range ds {
		s.NotEmpty(d.Digest)
		s.NotEmpty(d.ConnectionID)
		s.NotEmpty(d.Timestamp)

		// order by timestamp
		if i == 0 {
			continue
		}
		s.GreaterOrEqual(d.Timestamp, ds[i-1].Timestamp)
	}
}

func (s *testSlowQuerySuite) TestGetListSpecificFieldsRequest() {
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "digest,query"})

	for _, d := range ds {
		s.NotEmpty(d.Digest)
		s.NotEmpty(d.ConnectionID)
		s.NotEmpty(d.Timestamp)
		s.NotEmpty(d.Query)
	}
}

func (s *testSlowQuerySuite) TestGetListAllFieldsRequest() {
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "*"})
	var queryDs []slowquery.Model
	s.MockTableSession().
		Select("*,(UNIX_TIMESTAMP(Time) + 0E0) as timestamp").
		Limit(100).
		Order("Time").
		Find(&queryDs)

	s.Equal(ds, queryDs)
}

func (s *testSlowQuerySuite) TestGetListLimitRequest() {
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Limit: 5})

	s.Len(ds, 5)
}

func (s *testSlowQuerySuite) TestGetListSearchRequest() {
	digest := "2375da6810d9c5a0d1c84875b1376bfd469ad952c1884f5dc1d6f36fc953b5df"
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "*", Text: digest})

	s.NotEmpty(ds)
	for _, d := range ds {
		s.Contains(d.Digest, digest)
	}

	txnStartTS := ds[0].TxnStartTS
	ds2 := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "*", Text: txnStartTS})

	s.NotEmpty(ds2)
	for _, d := range ds2 {
		s.Contains(d.TxnStartTS, txnStartTS)
	}

	query := "INFORMATION_SCHEMA.CLUSTER_SLOW_QUERY"
	ds3 := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "*", Text: query})

	s.NotEmpty(ds3)
	for _, d := range ds3 {
		s.Contains(d.Query, query)
	}

	// TODO: search by Prev_stmt
}

func (s *testSlowQuerySuite) TestGetListMultiKeywordsSearchRequest() {
	digest := "2375da6810d9c5a0d1c84875b1376bfd469ad952c1884f5dc1d6f36fc953b5df"
	txnStartTS := "429825230089486339"
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Fields: "*", Text: fmt.Sprintf("%s %s", digest, txnStartTS)})

	s.Len(ds, 1)
	s.Contains(ds[0].Digest, digest)
	s.Contains(ds[0].TxnStartTS, txnStartTS)
}

func (s *testSlowQuerySuite) TestGetListUseDBRequest() {
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{DB: []string{"test"}})
	s.NotEmpty(ds)

	ds2 := s.mustQuerySlowLogList(&slowquery.GetListRequest{DB: []string{"not_exist_db"}})
	s.Empty(ds2)
}

func (s *testSlowQuerySuite) TestGetListOrderRequest() {
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{OrderBy: "txn_start_ts"})
	for i, d := range ds {
		if i == 0 {
			continue
		}
		s.GreaterOrEqual(d.TxnStartTS, ds[i-1].TxnStartTS)
	}

	ds2 := s.mustQuerySlowLogList(&slowquery.GetListRequest{IsDesc: true, OrderBy: "txn_start_ts"})
	for i, d := range ds2 {
		if i == 0 {
			continue
		}
		s.LessOrEqual(d.TxnStartTS, ds[i-1].TxnStartTS)
	}
}

func (s *testSlowQuerySuite) TestGetListPlansRequest() {
	ds := s.mustQuerySlowLogList(&slowquery.GetListRequest{Plans: []string{"a5e33155313418557311d13039dbf20aa54df3b825d062bdca92f1a271e5778a"}})
	s.NotEmpty(ds)

	ds2 := s.mustQuerySlowLogList(&slowquery.GetListRequest{Plans: []string{"not_exist_plan"}})
	s.Empty(ds2)
}
