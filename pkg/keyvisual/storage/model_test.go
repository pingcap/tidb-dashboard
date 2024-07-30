// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package storage

import (
	"path"
	"testing"
	"time"

	"github.com/pingcap/check"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/matrix"
)

func TestDbstore(t *testing.T) {
	check.TestingT(t)
}

var _ = check.Suite(&testDbstoreSuite{})

type testDbstoreSuite struct {
	dir string
	db  *dbstore.DB
}

func (t *testDbstoreSuite) SetUpTest(c *check.C) {
	t.dir = c.MkDir()
	gormDB, err := gorm.Open(sqlite.Open(path.Join(t.dir, "test.sqlite.db")))
	if err != nil {
		c.Errorf("Open %s error: %v", path.Join(t.dir, "test.sqlite.db"), err)
	}
	t.db = &dbstore.DB{DB: gormDB}
}

func (t *testDbstoreSuite) TestCreateTableAxisModelIfNotExists(c *check.C) {
	isExist, err := CreateTableAxisModelIfNotExists(t.db)
	c.Assert(isExist, check.Equals, false)
	c.Assert(err, check.IsNil)
	isExist, err = CreateTableAxisModelIfNotExists(t.db)
	c.Assert(isExist, check.Equals, true)
	c.Assert(err, check.IsNil)
}

func (t *testDbstoreSuite) TestClearTableAxisModel(c *check.C) {
	_, err := CreateTableAxisModelIfNotExists(t.db)
	if err != nil {
		c.Fatalf("Create table AxisModel error: %v", err)
	}
	axisModel, err := NewAxisModel(0, time.Now(), matrix.Axis{})
	if err != nil {
		c.Fatalf("NewAxisModel error: %v", err)
	}
	err = axisModel.Insert(t.db)
	if err != nil {
		c.Fatalf("AxisModel Insert error: %v", err)
	}
	var count int64

	err = t.db.Table(tableAxisModelName).Count(&count).Error
	if err != nil {
		c.Fatalf("Count table AxisModel error: %v", err)
	}
	c.Assert(count, check.Equals, int64(1))

	err = ClearTableAxisModel(t.db)
	c.Assert(err, check.IsNil)

	err = t.db.Table(tableAxisModelName).Count(&count).Error
	if err != nil {
		c.Fatalf("Count table AxisModel error: %v", err)
	}
	c.Assert(count, check.Equals, int64(0))
}

func (t *testDbstoreSuite) TestAxisModelFunc(c *check.C) {
	_, err := CreateTableAxisModelIfNotExists(t.db)
	if err != nil {
		c.Fatalf("Create table AxisModel error: %v", err)
	}
	var layerNum uint8
	endTime := time.Now()
	axis := matrix.Axis{
		Keys:       []string{"a", "b"},
		ValuesList: [][]uint64{{1}, {1}, {1}, {1}},
	}
	axisModel, err := NewAxisModel(layerNum, endTime, axis)
	if err != nil {
		c.Fatalf("NewAxisModel error: %v", err)
	}
	err = axisModel.Insert(t.db)
	c.Assert(err, check.IsNil)
	axisModels, err := FindAxisModelsOrderByTime(t.db, layerNum)
	if err != nil {
		c.Fatalf("FindAxisModelOrderByTime error: %v", err)
	}
	c.Assert(len(axisModels), check.Equals, 1)
	axisModelDeepEqual(axisModels[0], axisModel, c)
	obtainedAxis, err := axisModels[0].UnmarshalAxis()
	if err != nil {
		c.Fatalf("UnmarshalAxis error: %v", err)
	}
	c.Assert(obtainedAxis, check.DeepEquals, axis)

	err = axisModel.Delete(t.db)
	c.Assert(err, check.IsNil)

	var count int64
	err = t.db.Table(tableAxisModelName).Count(&count).Error
	if err != nil {
		c.Fatalf("Count table AxisModel error: %v", err)
	}
	c.Assert(count, check.Equals, int64(0))

	err = axisModel.Delete(t.db)
	c.Assert(err, check.IsNil)
}

func (t *testDbstoreSuite) TestAxisModelsFindAndDelete(c *check.C) {
	_, err := CreateTableAxisModelIfNotExists(t.db)
	if err != nil {
		c.Fatalf("Create table AxisModel error: %v", err)
	}

	var maxLayerNum uint8 = 2
	axisModelNumEachLayer := 3
	axisModelList := make([][]*AxisModel, maxLayerNum)
	for layerNum := uint8(0); layerNum < maxLayerNum; layerNum++ {
		axisModelList[layerNum] = make([]*AxisModel, axisModelNumEachLayer)
		for i := 0; i < axisModelNumEachLayer; i++ {
			axisModelList[layerNum][i], err = NewAxisModel(layerNum, time.Now(), matrix.Axis{})
			if err != nil {
				c.Fatalf("NewAxisModel error: %v", err)
			}
			err = axisModelList[layerNum][i].Insert(t.db)
			if err != nil {
				c.Fatalf("NewAxisModel error: %v", err)
			}
		}
	}

	var count int64
	err = t.db.Table(tableAxisModelName).Count(&count).Error
	if err != nil {
		c.Fatalf("Count table AxisModel error: %v", err)
	}
	c.Assert(count, check.Equals, int64(int(maxLayerNum)*axisModelNumEachLayer))

	findLayerNum := maxLayerNum - 1
	axisModels, err := FindAxisModelsOrderByTime(t.db, findLayerNum)
	c.Assert(err, check.IsNil)
	axisModelsDeepEqual(axisModels, axisModelList[findLayerNum], c)

	err = DeleteAxisModelsByLayerNum(t.db, findLayerNum)
	c.Assert(err, check.IsNil)

	axisModels, err = FindAxisModelsOrderByTime(t.db, findLayerNum)
	c.Assert(err, check.IsNil)
	c.Assert(axisModels, check.HasLen, 0)

	err = t.db.Table(tableAxisModelName).Count(&count).Error
	if err != nil {
		c.Fatalf("Count table AxisModel error: %v", err)
	}
	c.Assert(count, check.Equals, int64(int(maxLayerNum-1)*axisModelNumEachLayer))
}

func axisModelsDeepEqual(obtainedAxisModels []*AxisModel, expectedAxisModels []*AxisModel, c *check.C) {
	c.Assert(len(obtainedAxisModels), check.Equals, len(expectedAxisModels))
	for i := range obtainedAxisModels {
		axisModelDeepEqual(obtainedAxisModels[i], expectedAxisModels[i], c)
	}
}

func axisModelDeepEqual(obtainedAxisModel *AxisModel, expectedAxisModel *AxisModel, c *check.C) {
	c.Assert(obtainedAxisModel.Time.Unix(), check.Equals, expectedAxisModel.Time.Unix())
	obtainedAxisModel.Time = expectedAxisModel.Time
	c.Assert(obtainedAxisModel, check.DeepEquals, expectedAxisModel)
}
