// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package tests

import (
	"fmt"
	"sync"
	"testing"

	mysqldriver "github.com/go-sql-driver/mysql"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/slowquery"
	"github.com/pingcap/tidb-dashboard/pkg/utils"
	"github.com/pingcap/tidb-dashboard/util/testutil"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"
)

func TestSlowQuery(t *testing.T) {
	db := testutil.OpenTestDB(t, func(c1 *mysqldriver.Config, c2 *gorm.Config) {
		// will be recorded in slow query if we set params
		c1.Params = map[string]string{}
	})

	suite.Run(t, &testSlowQuerySuite{
		db:        db,
		tableName: "INFORMATION_SCHEMA.CLUSTER_SLOW_QUERY",
	})
}

type testSlowQuerySuite struct {
	suite.Suite
	db           *testutil.TestDB
	tableName    string
	tableColumns []string
}

func (s *testSlowQuerySuite) SetupSuite() {
	// init current version table columns
	schema := utils.NewSysSchema()
	tableColumns, err := schema.GetTableColumnNames(s.db.Gorm(), s.tableName)
	s.Nil(err)
	s.tableColumns = tableColumns

	// init dataset
	var c int64
	err = s.db.Gorm().Table(s.tableName).Count(&c).Error
	s.Nil(err)
	if c == 0 {
		s.db.MustExec("SET tidb_slow_log_threshold = 0")
		var wg sync.WaitGroup
		for i := 1; i < 200; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				s.db.MustExec(fmt.Sprintf("SELECT count(*) FROM %s", s.tableName))
			}()
		}
		wg.Wait()
		s.db.MustExec("SET tidb_slow_log_threshold = 200")
	}

	s.db.MustExec("SET tidb_enable_slow_log = false")
}

func (s *testSlowQuerySuite) TearDownSuite() {
	s.db.MustExec("SET tidb_enable_slow_log = true")
	s.db.MustClose()
}

func (s *testSlowQuerySuite) Test_GetList_defaultParams() {
	defaultSelect := "Digest,Conn_ID,(UNIX_TIMESTAMP(Time) + 0E0) as timestamp"
	defaultLimit := 100
	defaultOrder := "Time"
	equalTests := []struct {
		req *slowquery.GetListRequest
		tx  *gorm.DB
	}{
		{
			req: &slowquery.GetListRequest{},
			tx: s.db.Gorm().Table(s.tableName).
				Select(defaultSelect).
				Limit(defaultLimit).
				Order(defaultOrder),
		},
		{
			req: &slowquery.GetListRequest{Fields: "digest,query,instance"},
			tx: s.db.Gorm().Table(s.tableName).
				Select(fmt.Sprintf("%s,%s", defaultSelect, "Query,INSTANCE")).
				Limit(defaultLimit).
				Order(defaultOrder),
		},
		{
			req: &slowquery.GetListRequest{Fields: "*"},
			tx: s.db.Gorm().Table(s.tableName).
				Select("*, (UNIX_TIMESTAMP(Time) + 0E0) AS timestamp").
				Limit(defaultLimit).
				Order(defaultOrder),
		},
		{
			req: &slowquery.GetListRequest{Limit: 5},
			tx: s.db.Gorm().Table(s.tableName).
				Select(defaultSelect).
				Limit(5).
				Order(defaultOrder),
		},
		{
			req: &slowquery.GetListRequest{Text: "tidb_slow_log_threshold"},
			tx: s.db.Gorm().Table(s.tableName).
				Select(defaultSelect).
				Where(
					`Txn_start_ts REGEXP ?
					 OR LOWER(Digest) REGEXP ?
					 OR LOWER(CONVERT(Prev_stmt USING utf8)) REGEXP ?
					 OR LOWER(CONVERT(Query USING utf8)) REGEXP ?`,
					"tidb_slow_log_threshold", "tidb_slow_log_threshold", "tidb_slow_log_threshold", "tidb_slow_log_threshold").
				Limit(defaultLimit).
				Order(defaultOrder),
		},
		{
			req: &slowquery.GetListRequest{DB: []string{"test"}},
			tx: s.db.Gorm().Table(s.tableName).
				Select(defaultSelect).
				Where("DB IN (?)", []string{"test"}).
				Limit(defaultLimit).
				Order(defaultOrder),
		},
		{
			req: &slowquery.GetListRequest{OrderBy: "query"},
			tx: s.db.Gorm().Table(s.tableName).
				Select(defaultSelect).
				Limit(defaultLimit).
				Order("Query"),
		},
		{
			req: &slowquery.GetListRequest{IsDesc: true},
			tx: s.db.Gorm().Table(s.tableName).
				Select(defaultSelect).
				Limit(defaultLimit).
				Order(fmt.Sprintf("%s DESC", defaultOrder)),
		},
		{
			req: &slowquery.GetListRequest{Plans: []string{""}},
			tx: s.db.Gorm().Table(s.tableName).
				Select(defaultSelect).
				Where("Plan_digest IN (?)", []string{""}).
				Limit(defaultLimit).
				Order(defaultOrder),
		},
	}

	notEqualTests := []struct {
		req *slowquery.GetListRequest
		tx  *gorm.DB
	}{
		{
			req: &slowquery.GetListRequest{OrderBy: "query"},
			tx: s.db.Gorm().Table(s.tableName).
				Select(defaultSelect).
				Limit(defaultLimit).
				Order(defaultOrder),
		},
	}

	for _, t := range equalTests {
		data1, err1 := slowquery.QuerySlowLogList(t.req, s.tableColumns, s.db.Gorm())
		s.Nil(err1)

		var data2 []slowquery.Model
		err2 := t.tx.Find(&data2).Error
		s.Nil(err2)

		s.Equal(data1, data2)
	}

	for _, t := range notEqualTests {
		data1, err1 := slowquery.QuerySlowLogList(t.req, s.tableColumns, s.db.Gorm())
		s.Nil(err1)

		var data2 []slowquery.Model
		err2 := t.tx.Find(&data2).Error
		s.Nil(err2)

		s.NotEqual(data1, data2)
	}
}
