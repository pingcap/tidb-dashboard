// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

//go:build integration
// +build integration

package datatype

import (
	"fmt"
	"testing"

	mysqldriver "github.com/go-sql-driver/mysql"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/util/testutil"
)

type IntORMSuite struct {
	suite.Suite
	usePrepareStatement bool

	db        *testutil.TestDB
	tableName string
}

func (suite *IntORMSuite) SetupSuite() {
	suite.db = testutil.OpenTestDB(suite.T(), func(_ *mysqldriver.Config, config *gorm.Config) {
		config.PrepareStmt = suite.usePrepareStatement
	})
	suite.tableName = "`" + suite.db.NewID() + "`"
	suite.db.MustExec(fmt.Sprintf(`CREATE TABLE %s (
		a bigint,
		b double,
		c varchar(50),
		d boolean,
		e varchar(10)
	)`, suite.tableName))
	suite.db.MustExec(fmt.Sprintf(`INSERT INTO %s VALUES (
		73371569,
		965511.2870,
		"123456",
		1,
		"abc"
	)`, suite.tableName))
}

func (suite *IntORMSuite) TearDownSuite() {
	suite.db.MustExec(fmt.Sprintf(`DROP TABLE IF EXISTS %s`, suite.tableName))
	suite.db.MustClose()
}

func (suite *IntORMSuite) TestScanFromInt() {
	var r struct {
		A Int
	}
	err := suite.db.Gorm().Table(suite.tableName).Select("a").Take(&r).Error
	suite.Require().NoError(err)
	suite.Require().Equal(Int(73371569), r.A)
}

func (suite *IntORMSuite) TestScanFromDouble() {
	var r struct {
		B Int
	}
	err := suite.db.Gorm().Table(suite.tableName).Select("b").Take(&r).Error
	suite.Require().NoError(err)
	suite.Require().Equal(Int(965511), r.B)
}

func (suite *IntORMSuite) TestScanFromString() {
	var r struct {
		C Int
	}
	err := suite.db.Gorm().Table(suite.tableName).Select("c").Take(&r).Error
	suite.Require().NoError(err)
	suite.Require().Equal(Int(123456), r.C)
}

func (suite *IntORMSuite) TestScanFromBoolean() {
	var r struct {
		D Int
	}
	err := suite.db.Gorm().Table(suite.tableName).Select("d").Take(&r).Error
	suite.Require().NoError(err)
	suite.Require().Equal(Int(1), r.D)
}

func (suite *IntORMSuite) TestScanFromNonNumericString() {
	var r struct {
		E Int
	}
	err := suite.db.Gorm().Table(suite.tableName).Select("e").Take(&r).Error
	suite.Require().Error(err)
}

// Scanning double into int is invalid. That's why we need Int.
func (suite *IntORMSuite) TestScanDoubleToStdInt() {
	var r struct {
		B int
	}
	err := suite.db.Gorm().Table(suite.tableName).Select("b").Take(&r).Error
	suite.Require().Error(err)
}

func (suite *IntORMSuite) TestWhere() {
	var r struct {
		A Int
	}
	err := suite.db.Gorm().
		Table(suite.tableName).
		Select("a").
		Where("a = ?", Int(73371569)).
		Take(&r).Error
	suite.Require().NoError(err)
	suite.Require().Equal(Int(73371569), r.A)

	err = suite.db.Gorm().
		Table(suite.tableName).
		Select("a").
		Where("a > ?", Int(0)).
		Take(&r).Error
	suite.Require().NoError(err)
	suite.Require().Equal(Int(73371569), r.A)

	err = suite.db.Gorm().
		Table(suite.tableName).
		Select("a").
		Where("a = ?", Int(123)).
		Take(&r).Error
	suite.Require().Error(err)
	suite.Require().Equal(gorm.ErrRecordNotFound, err)

	err = suite.db.Gorm().
		Table(suite.tableName).
		Select("a").
		Where("a > ?", Int(73371570)).
		Take(&r).Error
	suite.Require().Error(err)
	suite.Require().Equal(gorm.ErrRecordNotFound, err)

	err = suite.db.Gorm().
		Table(suite.tableName).
		Select("a").
		Where("a = ?", "73371569").
		Take(&r).Error
	suite.Require().NoError(err)
	suite.Require().Equal(Int(73371569), r.A)

	// Matching a double field will never succeed, since int lose precision
	val := 965511.2870
	err = suite.db.Gorm().
		Table(suite.tableName).
		Select("b").
		Where("b = ?", Int(val)).
		Take(&r).Error
	suite.Require().Error(err)
	suite.Require().Equal(gorm.ErrRecordNotFound, err)
}

func (suite *IntORMSuite) TestWhereInIndex() {
	tableName := "`" + suite.db.NewID() + "`"

	suite.db.MustExec(fmt.Sprintf(`CREATE TABLE %s (
		id int,
		val int,
		INDEX idx (val)
	)`, tableName))
	suite.db.MustExec(fmt.Sprintf(`INSERT INTO %s VALUES (
		1,
		42160690
	)`, tableName))

	defer suite.db.MustExec(fmt.Sprintf(`DROP TABLE IF EXISTS %s`, tableName))

	var r struct {
		Val Int
	}
	err := suite.db.Gorm().
		Table(tableName).
		Select("val").
		Where("val = ?", Int(42160690)).
		Take(&r).Error
	suite.Require().NoError(err)
	suite.Require().Equal(Int(42160690), r.Val)

	// Verify Plan is Index Scan
	explain := suite.db.
		MustExplain(fmt.Sprintf("SELECT val FROM %s WHERE val = ?", tableName), Int(42160690))
	testutil.RequireIndexRangeScan(suite.T(), explain)
}

func (suite *IntORMSuite) TestInsert() {
	tableName := "`" + suite.db.NewID() + "`"

	suite.db.MustExec(fmt.Sprintf(`CREATE TABLE %s (
		id int,
		val bigint
	)`, tableName))

	defer suite.db.MustExec(fmt.Sprintf(`DROP TABLE IF EXISTS %s`, tableName))

	type model struct {
		ID  int
		Val Int
	}
	err := suite.db.Gorm().Table(tableName).Create(model{
		ID:  10,
		Val: Int(12346),
	}).Error
	suite.Require().NoError(err)

	var r model
	err = suite.db.Gorm().Table(tableName).Take(&r).Error
	suite.Require().NoError(err)
	suite.Require().Equal(10, r.ID)
	suite.Require().Equal(Int(12346), r.Val)
}

func (suite *IntORMSuite) TestScanNull() {
	tableName := "`" + suite.db.NewID() + "`"

	suite.db.MustExec(fmt.Sprintf(`CREATE TABLE %s (
		id int,
		val bigint
	)`, tableName))
	suite.db.MustExec(fmt.Sprintf(`INSERT INTO %s VALUES (
		100,
		null
	)`, tableName))

	defer suite.db.MustExec(fmt.Sprintf(`DROP TABLE IF EXISTS %s`, tableName))

	var r struct {
		Val Int
	}
	err := suite.db.Gorm().
		Table(tableName).
		Select("val").
		Take(&r).Error
	suite.Require().NoError(err)
	suite.Require().Equal(Int(0), r.Val)
}

func TestIntInORM(t *testing.T) {
	suite.Run(t, &IntORMSuite{
		usePrepareStatement: false,
	})
}

func TestIntInORMWithPrepared(t *testing.T) {
	suite.Run(t, &IntORMSuite{
		usePrepareStatement: true,
	})
}
