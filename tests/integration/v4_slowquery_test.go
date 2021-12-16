// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package integration

import (
	"fmt"
	"os"
	"strings"
	"sync"
	"testing"

	"github.com/stretchr/testify/suite"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/slowquery"
	"github.com/pingcap/tidb-dashboard/util/testutil"
)

type testV4SlowQuerySuite struct {
	suite.Suite
	db *testutil.TestDB
}

func TestV4SlowQuery(t *testing.T) {
	if !strings.Contains(os.Getenv("TIDB_VERSION"), "v4") {
		t.Skip()
	}

	db := testutil.OpenTestDB(t)
	suite.Run(t, &testV4SlowQuerySuite{
		db: db,
	})
}

func (s *testV4SlowQuerySuite) SetupSuite() {
	s.prepareSlowQuery()
}

func (s *testV4SlowQuerySuite) TearDownSuite() {
	s.db.MustClose()
}

func (s *testV4SlowQuerySuite) prepareSlowQuery() {
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
}

// func (s *testV4SlowQuerySuite) slowQuerySession() *gorm.DB {
// 	return s.db.Gorm().Debug().Table(slowquery.SlowQueryTable)
// }
