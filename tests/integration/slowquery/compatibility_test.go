// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

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

type testCompatibilitySuite struct {
	suite.Suite
	db        *testutil.TestDB
	sysSchema *utils.SysSchema
}

func TestCompatibilitySuite(t *testing.T) {
	db := testutil.OpenTestDB(t)
	sysSchema := utils.NewSysSchema()

	suite.Run(t, &testCompatibilitySuite{
		db:        db,
		sysSchema: sysSchema,
	})
}

func (s *testCompatibilitySuite) SetupSuite() {
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

func (s *testCompatibilitySuite) TearDownSuite() {
	s.db.MustClose()
	_ = s.sysSchema.Close()
}

func (s *testCompatibilitySuite) dbSession() *gorm.DB {
	return s.db.Gorm().Debug().Table(slowquery.SlowQueryTable)
}

func (s *testCompatibilitySuite) mockDBSession() *gorm.DB {
	return s.db.Gorm().Debug().Table(TestSlowQueryTableName)
}

func (s *testCompatibilitySuite) mustQuerySlowLogListWithMockDB(req *slowquery.GetListRequest) []slowquery.Model {
	d, err := slowquery.QuerySlowLogList(req, s.sysSchema, s.mockDBSession())
	s.Require().NoError(err)
	return d
}

func (s *testCompatibilitySuite) TestFieldsCompatibility() {
	if util.CheckTiDBVersion(s.Require(), "< 5.0.0") {
		ds := s.mustQuerySlowLogListWithMockDB(&slowquery.GetListRequest{Digest: "TEST_ALL_FIELDS", Fields: "*"})
		s.Require().Len(ds, 1)
		d := ds[0]
		s.Require().Empty(d.DiskMax)
		s.Require().Empty(d.ExecRetryTime)
		s.Require().Empty(d.OptimizeTime)
		s.Require().Empty(d.PreprocSubqueriesTime)
		s.Require().Empty(d.RewriteTime)
		s.Require().Empty(d.WaitTSTime)
		s.Require().Empty(d.WriteRespTime)
		s.Require().Empty(d.RocksdbBlockCacheHitCount)
		s.Require().Empty(d.RocksdbBlockReadByte)
		s.Require().Empty(d.RocksdbBlockReadCount)
		s.Require().Empty(d.RocksdbDeleteSkippedCount)
		s.Require().Empty(d.RocksdbKeySkippedCount)
	}

	if util.CheckTiDBVersion(s.Require(), ">= 5.0.0") {
		ds := s.mustQuerySlowLogListWithMockDB(&slowquery.GetListRequest{Digest: "TEST_ALL_FIELDS", Fields: "*"})
		s.Require().Len(ds, 1)
		d := ds[0]
		s.Require().NotEmpty(d.DiskMax)
		s.Require().NotEmpty(d.ExecRetryTime)
		s.Require().NotEmpty(d.OptimizeTime)
		s.Require().NotEmpty(d.PreprocSubqueriesTime)
		s.Require().NotEmpty(d.RewriteTime)
		s.Require().NotEmpty(d.WaitTSTime)
		s.Require().NotEmpty(d.WriteRespTime)
		s.Require().NotEmpty(d.RocksdbBlockCacheHitCount)
		s.Require().NotEmpty(d.RocksdbBlockReadByte)
		s.Require().NotEmpty(d.RocksdbBlockReadCount)
		s.Require().NotEmpty(d.RocksdbDeleteSkippedCount)
		s.Require().NotEmpty(d.RocksdbKeySkippedCount)
	}
}

func (s *testCompatibilitySuite) TestQueryTableColumns() {
	if util.CheckTiDBVersion(s.Require(), "< 5.0.0") {
		cls, err := slowquery.GetAvailableFields(s.sysSchema, s.dbSession())
		s.Require().NoError(err)
		s.Require().NotContains(cls, "rocksdb_delete_skipped_count")
		s.Require().NotContains(cls, "rocksdb_key_skipped_count")
		s.Require().NotContains(cls, "rocksdb_block_cache_hit_count")
		s.Require().NotContains(cls, "rocksdb_block_read_count")
		s.Require().NotContains(cls, "rocksdb_block_read_byte")
	}

	if util.CheckTiDBVersion(s.Require(), ">= 5.0.0") {
		cls, err := slowquery.GetAvailableFields(s.sysSchema, s.dbSession())
		s.Require().NoError(err)
		s.Require().Contains(cls, "rocksdb_delete_skipped_count")
		s.Require().Contains(cls, "rocksdb_key_skipped_count")
		s.Require().Contains(cls, "rocksdb_block_cache_hit_count")
		s.Require().Contains(cls, "rocksdb_block_read_count")
		s.Require().Contains(cls, "rocksdb_block_read_byte")
	}
}
