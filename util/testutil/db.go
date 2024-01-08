// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package testutil

import (
	"encoding/hex"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	mysqldriver "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
	"github.com/pingcap/log"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"moul.io/zapgorm2"
)

type TestDB struct {
	inner   *gorm.DB
	require *require.Assertions

	isUnderlyingMocked bool
	mock               sqlmock.Sqlmock
}

func OpenTestDB(t *testing.T, configModifier ...func(*mysqldriver.Config, *gorm.Config)) *TestDB {
	r := require.New(t)

	dsn := mysqldriver.NewConfig()
	dsn.Net = "tcp"
	dsn.Addr = "127.0.0.1:4000"
	dsn.Params = map[string]string{"time_zone": "'+00:00'"}
	dsn.ParseTime = true
	dsn.Loc = time.UTC
	dsn.User = "root"
	dsn.DBName = "test"

	config := &gorm.Config{
		Logger: zapgorm2.New(log.L()),
	}

	for _, m := range configModifier {
		m(dsn, config)
	}

	db, err := gorm.Open(mysql.Open(dsn.FormatDSN()), config)
	r.NoError(err)

	return &TestDB{
		inner:   db.Debug(),
		require: r,
	}
}

func OpenMockDB(t *testing.T, configModifier ...func(*gorm.Config)) *TestDB {
	r := require.New(t)

	sqlDB, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
	require.NoError(t, err)

	config := &gorm.Config{
		Logger: zapgorm2.New(log.L()),
	}

	for _, m := range configModifier {
		m(config)
	}

	db, err := gorm.Open(mysql.New(mysql.Config{
		Conn:                      sqlDB,
		SkipInitializeWithVersion: true,
	}), config)
	r.NoError(err)

	return &TestDB{
		inner:   db.Debug(),
		require: r,

		isUnderlyingMocked: true,
		mock:               mock,
	}
}

func (db *TestDB) MustClose() {
	if db.isUnderlyingMocked {
		db.mock.ExpectClose()
	}

	d, err := db.inner.DB()
	db.require.NoError(err)

	err = d.Close()
	db.require.NoError(err)
}

func (db *TestDB) NewID() string {
	id := uuid.New()
	return hex.EncodeToString(id[:])
}

func (db *TestDB) Gorm() *gorm.DB {
	return db.inner
}

func (db *TestDB) MustExec(sql string, values ...interface{}) {
	err := db.inner.Exec(sql, values...).Error
	db.require.NoError(err)
}

type ExplainRow struct {
	ID string `gorm:"column:id"`
}

func (db *TestDB) MustExplain(sql string, values ...interface{}) []ExplainRow {
	var rows []ExplainRow
	err := db.Gorm().Raw("EXPLAIN "+sql, values...).Scan(&rows).Error
	db.require.NoError(err)
	return rows
}

func (db *TestDB) Mocker() sqlmock.Sqlmock {
	db.require.True(db.isUnderlyingMocked)
	return db.mock
}

func (db *TestDB) MustMeetMockExpectation() {
	db.require.Nil(db.Mocker().ExpectationsWereMet())
}

func RequireIndexRangeScan(t *testing.T, explain []ExplainRow) {
	hasIndexRange := false
	for _, r := range explain {
		if strings.Contains(r.ID, "IndexRangeScan") {
			hasIndexRange = true
			break
		}
	}
	require.True(t, hasIndexRange, "IndexRangeScan is not contained in the explain result", explain)
}
