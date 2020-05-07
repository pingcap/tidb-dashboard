package storage

import (
	"path"
	"testing"
	"time"

	"github.com/jinzhu/gorm"
	. "github.com/pingcap/check"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/matrix"
)

func TestDbstore(t *testing.T) {
	TestingT(t)
}

var _ = Suite(&testDbstoreSuite{})

type testDbstoreSuite struct {
	dir string
	db  *dbstore.DB
}

func (t *testDbstoreSuite) SetUpTest(c *C) {
	t.dir = c.MkDir()
	gormDB, err := gorm.Open("sqlite3", path.Join(t.dir, "test.sqlite.db"))
	if err != nil {
		c.Errorf("Open %s error: %v", path.Join(t.dir, "test.sqlite.db"), err)
	}
	t.db = &dbstore.DB{DB: gormDB}
}

func (t *testDbstoreSuite) TearDownTest(c *C) {
	_ = t.db.Close()
}

func (t *testDbstoreSuite) TestCreateTablePlaneIfNotExists(c *C) {
	isExist, err := CreateTablePlaneIfNotExists(t.db)
	c.Assert(isExist, Equals, false)
	c.Assert(err, IsNil)
	isExist, err = CreateTablePlaneIfNotExists(t.db)
	c.Assert(isExist, Equals, true)
	c.Assert(err, IsNil)
}

func (t *testDbstoreSuite) TestClearTablePlane(c *C) {
	_, err := CreateTablePlaneIfNotExists(t.db)
	if err != nil {
		c.Fatalf("Create table Plane error: %v", err)
	}
	plane, err := NewPlane(0, time.Now(), matrix.Axis{})
	if err != nil {
		c.Fatalf("NewPlane error: %v", err)
	}
	err = plane.Insert(t.db)
	if err != nil {
		c.Fatalf("Plane Insert error: %v", err)
	}
	var count int

	err = t.db.Table(tablePlaneName).Count(&count).Error
	if err != nil {
		c.Fatalf("Count table Plane error: %v", err)
	}
	c.Assert(count, Equals, 1)

	err = ClearTablePlane(t.db)
	c.Assert(err, IsNil)

	err = t.db.Table(tablePlaneName).Count(&count).Error
	if err != nil {
		c.Fatalf("Count table Plane error: %v", err)
	}
	c.Assert(count, Equals, 0)
}

func (t *testDbstoreSuite) TestPlaneFunc(c *C) {
	_, err := CreateTablePlaneIfNotExists(t.db)
	if err != nil {
		c.Fatalf("Create table Plane error: %v", err)
	}
	var layerNum uint8 = 0
	endTime := time.Now()
	axis := matrix.Axis{
		Keys:       []string{"a", "b"},
		ValuesList: [][]uint64{{1}, {1}, {1}, {1}},
	}
	plane, err := NewPlane(layerNum, endTime, axis)
	if err != nil {
		c.Fatalf("NewPlane error: %v", err)
	}
	err = plane.Insert(t.db)
	c.Assert(err, IsNil)
	planes, err := FindPlanesOrderByTime(t.db, layerNum)
	if err != nil {
		c.Fatalf("FindPlaneOrderByTime error: %v", err)
	}
	c.Assert(len(planes), Equals, 1)
	planeDeepEqual(planes[0], plane, c)
	obtainedAxis, err := planes[0].UnmarshalAxis()
	if err != nil {
		c.Fatalf("UnmarshalAxis error: %v", err)
	}
	c.Assert(obtainedAxis, DeepEquals, axis)

	err = plane.Delete(t.db)
	c.Assert(err, IsNil)

	var count int
	err = t.db.Table(tablePlaneName).Count(&count).Error
	if err != nil {
		c.Fatalf("Count table Plane error: %v", err)
	}
	c.Assert(count, Equals, 0)

	err = plane.Delete(t.db)
	c.Assert(err, IsNil)
}

func (t *testDbstoreSuite) TestPlanesFindAndDelete(c *C) {
	_, err := CreateTablePlaneIfNotExists(t.db)
	if err != nil {
		c.Fatalf("Create table Plane error: %v", err)
	}

	var maxLayerNum uint8 = 2
	var planeNumEachLayer = 3
	var planeList = make([][]*Plane, maxLayerNum)
	for layerNum := uint8(0); layerNum < maxLayerNum; layerNum++ {
		planeList[layerNum] = make([]*Plane, planeNumEachLayer)
		for i := 0; i < planeNumEachLayer; i++ {
			planeList[layerNum][i], err = NewPlane(layerNum, time.Now(), matrix.Axis{})
			if err != nil {
				c.Fatalf("NewPlane error: %v", err)
			}
			err = planeList[layerNum][i].Insert(t.db)
			if err != nil {
				c.Fatalf("NewPlane error: %v", err)
			}
		}
	}

	var count int
	err = t.db.Table(tablePlaneName).Count(&count).Error
	if err != nil {
		c.Fatalf("Count table Plane error: %v", err)
	}
	c.Assert(count, Equals, int(maxLayerNum)*planeNumEachLayer)

	findLayerNum := maxLayerNum - 1
	planes, err := FindPlanesOrderByTime(t.db, findLayerNum)
	c.Assert(err, IsNil)
	planesDeepEqual(planes, planeList[findLayerNum], c)

	err = DeletePlanesByLayerNum(t.db, findLayerNum)
	c.Assert(err, IsNil)

	planes, err = FindPlanesOrderByTime(t.db, findLayerNum)
	c.Assert(err, IsNil)
	c.Assert(planes, HasLen, 0)

	err = t.db.Table(tablePlaneName).Count(&count).Error
	if err != nil {
		c.Fatalf("Count table Plane error: %v", err)
	}
	c.Assert(count, Equals, int(maxLayerNum-1)*planeNumEachLayer)
}

func planesDeepEqual(obtainedPlanes []*Plane, expectedPlanes []*Plane, c *C) {
	c.Assert(len(obtainedPlanes), Equals, len(expectedPlanes))
	for i := range obtainedPlanes {
		planeDeepEqual(obtainedPlanes[i], expectedPlanes[i], c)
	}
}

func planeDeepEqual(obtainedPlane *Plane, expectedPlane *Plane, c *C) {
	c.Assert(obtainedPlane.Time.Unix(), Equals, expectedPlane.Time.Unix())
	obtainedPlane.Time = expectedPlane.Time
	c.Assert(obtainedPlane, DeepEquals, expectedPlane)
}