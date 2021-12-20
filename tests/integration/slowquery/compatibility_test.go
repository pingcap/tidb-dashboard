// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package slowquery

import (
	"fmt"
	"sync"
	"testing"

	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/slowquery"
	"github.com/pingcap/tidb-dashboard/pkg/utils"
	"github.com/pingcap/tidb-dashboard/tests/util"
	"github.com/pingcap/tidb-dashboard/util/testutil"
)

type testWithDBSuite struct {
	suite.Suite
	db        *testutil.TestDB
	sysSchema *utils.SysSchema
}

func TestWithDBSuite(t *testing.T) {
	db := testutil.OpenTestDB(t)
	sysSchema := utils.NewSysSchema()

	suite.Run(t, &testWithDBSuite{
		db:        db,
		sysSchema: sysSchema,
	})
}

func (s *testWithDBSuite) SetupSuite() {
	s.db.MustExec("SET tidb_slow_log_threshold = 0")
	var wg sync.WaitGroup
	for i := 1; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			s.db.MustExec(fmt.Sprintf("SELECT count(*) FROM %s", slowquery.SlowQueryTable))
		}()
	}
	wg.Wait()
	s.db.MustExec("SET tidb_slow_log_threshold = 300")

	util.LoadFixtures(s.T(), s.db, "../../fixtures")
}

func (s *testWithDBSuite) TearDownSuite() {
	s.db.MustClose()
}

func (s *testWithDBSuite) dbSession() *gorm.DB {
	return s.db.Gorm().Debug().Table(slowquery.SlowQueryTable)
}

func (s *testWithDBSuite) mockDBSession() *gorm.DB {
	return s.db.Gorm().Debug().Table(TestSlowQueryTableName)
}

func (s *testWithDBSuite) mustQuerySlowLogListWithMockDB(req *slowquery.GetListRequest) []slowquery.Model {
	d, err := slowquery.QuerySlowLogList(req, s.sysSchema, s.mockDBSession())
	s.Require().NoError(err)
	return d
}

func (s *testWithDBSuite) TestQueryTableColumns() {
	if util.CheckTiDBVersion(s.Require(), "< 5.0.0") {
		cls, err := slowquery.QueryTableColumns(s.sysSchema, s.dbSession())
		s.Require().NoError(err)
		s.Require().NotContains(cls, "Rocksdb_delete_skipped_count")
		s.Require().NotContains(cls, "Rocksdb_key_skipped_count")
		s.Require().NotContains(cls, "Rocksdb_block_cache_hit_count")
		s.Require().NotContains(cls, "Rocksdb_block_read_count")
		s.Require().NotContains(cls, "Rocksdb_block_read_byte")
	}

	if util.CheckTiDBVersion(s.Require(), ">= 5.0.0") {
		cls, err := slowquery.QueryTableColumns(s.sysSchema, s.dbSession())
		s.Require().NoError(err)
		s.Require().Contains(cls, "Rocksdb_delete_skipped_count")
		s.Require().Contains(cls, "Rocksdb_key_skipped_count")
		s.Require().Contains(cls, "Rocksdb_block_cache_hit_count")
		s.Require().Contains(cls, "Rocksdb_block_read_count")
		s.Require().Contains(cls, "Rocksdb_block_read_byte")
	}
}

func (s *testWithDBSuite) TestFieldsCompatibility() {
	if util.CheckTiDBVersion(s.Require(), "< 5.0.0") {
		ds := s.mustQuerySlowLogListWithMockDB(&slowquery.GetListRequest{Fields: "*"})
		for _, d := range ds {
			s.Require().Empty(d.RocksdbBlockCacheHitCount)
			s.Require().Empty(d.RocksdbBlockReadByte)
			s.Require().Empty(d.RocksdbBlockReadCount)
			s.Require().Empty(d.RocksdbDeleteSkippedCount)
			s.Require().Empty(d.RocksdbKeySkippedCount)
		}
	}

	if util.CheckTiDBVersion(s.Require(), ">= 5.0.0") {
		ds := s.mustQuerySlowLogListWithMockDB(&slowquery.GetListRequest{Fields: "*"})
		for _, d := range ds {
			s.Require().NotEmpty(d.RocksdbBlockCacheHitCount)
			s.Require().NotEmpty(d.RocksdbBlockReadByte)
			s.Require().NotEmpty(d.RocksdbBlockReadCount)
			s.Require().NotEmpty(d.RocksdbDeleteSkippedCount)
			s.Require().NotEmpty(d.RocksdbKeySkippedCount)
		}
	}
}
