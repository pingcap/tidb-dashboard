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
	testTableName     = "INFORMATION_SCHEMA.CLUSTER_SLOW_QUERY"
	testMockTableName = "mock.INFORMATION_SCHEMA.CLUSTER_SLOW_QUERY"
)

func TestSlowQuery(t *testing.T) {
	db := testutil.OpenTestDB(t, func(c1 *mysqldriver.Config, c2 *gorm.Config) {
		// will be recorded in slow query if we set params
		c1.Params = map[string]string{}
	})

	suite.Run(t, &testSlowQuerySuite{
		db: db,
	})
}

type testSlowQuerySuite struct {
	suite.Suite
	db *testutil.TestDB
}

func (s *testSlowQuerySuite) tableSession() *gorm.DB {
	return s.db.Gorm().Debug().Table(testTableName)
}

// func (s *testSlowQuerySuite) mockTableSession() *gorm.DB {
// 	return s.db.Gorm().Debug().Table(testMockTableName)
// }

func (s *testSlowQuerySuite) SetupSuite() {
	// init dataset
	var c int64
	err := s.tableSession().Count(&c).Error
	s.Nil(err)
	if c == 0 {
		s.db.MustExec("SET tidb_slow_log_threshold = 0")
		var wg sync.WaitGroup
		for i := 1; i < 200; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				s.db.MustExec(fmt.Sprintf("SELECT count(*) FROM %s", testTableName))
			}()
		}
		wg.Wait()
		s.db.MustExec("SET tidb_slow_log_threshold = 200")
	}

	s.db.MustExec("SET tidb_enable_slow_log = false")

	// init mock table
	// FIXME: Table '.INFORMATION_SCHEMA.CLUSTER_SLOW_QUERY' doesn't exist
	// s.db.MustExec(fmt.Sprintf("CREATE TABLE `%s` LIKE `%s`", testMockTableName, testTableName))
	// FIXME: 'CREATE TABLE ... SELECT' is not implemented yet
	// s.db.MustExec(fmt.Sprintf("CREATE TABLE `%s` SELECT * FROM `%s` LIMIT 0", testMockTableName, testTableName))
	// init mock dataset
	// ...
}

func (s *testSlowQuerySuite) TearDownSuite() {
	s.db.MustExec("SET tidb_enable_slow_log = true")
	s.db.MustExec(fmt.Sprintf("DROP TABLE IF EXISTS `%s`", testMockTableName))
	s.db.MustClose()
}

func (s *testSlowQuerySuite) Test_GetList_defaultParams() {
	var lastRecord slowquery.Model
	err := s.tableSession().Order("Time").Last(&lastRecord).Error
	s.Nil(err)
	var firstRecord slowquery.Model
	err = s.tableSession().Order("Time").First(&firstRecord).Error
	s.Nil(err)

	defaultSelect := "Digest,Conn_ID,(UNIX_TIMESTAMP(Time) + 0E0) as timestamp"
	defaultLimit := 100
	defaultOrder := "Time"
	equalTests := []struct {
		req *slowquery.GetListRequest
		tx  *gorm.DB
	}{
		{
			req: &slowquery.GetListRequest{},
			tx: s.tableSession().
				Select(defaultSelect).
				Limit(defaultLimit).
				Order(defaultOrder),
		},
		{
			req: &slowquery.GetListRequest{Fields: "digest,query,instance"},
			tx: s.tableSession().
				Select(fmt.Sprintf("%s,%s", defaultSelect, "Query,INSTANCE")).
				Limit(defaultLimit).
				Order(defaultOrder),
		},
		{
			req: &slowquery.GetListRequest{Fields: "*"},
			tx: s.tableSession().
				Select("*, (UNIX_TIMESTAMP(Time) + 0E0) AS timestamp").
				Limit(defaultLimit).
				Order(defaultOrder),
		},
		{
			req: &slowquery.GetListRequest{Limit: 5},
			tx: s.tableSession().
				Select(defaultSelect).
				Limit(5).
				Order(defaultOrder),
		},
		{
			req: &slowquery.GetListRequest{Text: firstRecord.Digest},
			tx: s.tableSession().
				Select(defaultSelect).
				Where(
					`LOWER(Digest) REGEXP ?`, firstRecord.Digest).
				Limit(defaultLimit).
				Order(defaultOrder),
		},
		{
			req: &slowquery.GetListRequest{Text: fmt.Sprintf("%s %s", firstRecord.Digest, lastRecord.TxnStartTS)},
			tx: s.tableSession().
				Select(defaultSelect).
				Where(
					`Txn_start_ts REGEXP ? AND LOWER(Digest) REGEXP ?`,
					lastRecord.TxnStartTS, firstRecord.Digest).
				Limit(defaultLimit).
				Order(defaultOrder),
		},
		{
			req: &slowquery.GetListRequest{DB: []string{"test"}},
			tx: s.tableSession().
				Select(defaultSelect).
				Where("DB IN (?)", []string{"test"}).
				Limit(defaultLimit).
				Order(defaultOrder),
		},
		{
			req: &slowquery.GetListRequest{OrderBy: "query"},
			tx: s.tableSession().
				Select(defaultSelect).
				Limit(defaultLimit).
				Order("Query"),
		},
		{
			req: &slowquery.GetListRequest{IsDesc: true},
			tx: s.tableSession().
				Select(defaultSelect).
				Limit(defaultLimit).
				Order(fmt.Sprintf("%s DESC", defaultOrder)),
		},
		{
			req: &slowquery.GetListRequest{Plans: []string{""}},
			tx: s.tableSession().
				Select(defaultSelect).
				Where("Plan_digest IN (?)", []string{""}).
				Limit(defaultLimit).
				Order(defaultOrder),
		},
	}

	tableColumns, err := utils.NewSysSchema().GetTableColumnNames(s.tableSession(), testTableName)
	s.Nil(err)

	for _, t := range equalTests {
		data1, err1 := slowquery.QuerySlowLogList(t.req, tableColumns, s.db.Gorm())
		s.Nil(err1)

		var data2 []slowquery.Model
		err2 := t.tx.Find(&data2).Error
		s.Nil(err2)

		s.Equal(data1, data2)
	}
}
