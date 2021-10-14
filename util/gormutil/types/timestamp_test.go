package types

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/util/testutil"
)

type TimestampORMSuite struct {
	suite.Suite

	db        *testutil.TestDB
	tableName string
}

func (suite *TimestampORMSuite) SetupSuite() {
	suite.db = testutil.OpenTestDB(suite.T())
	suite.tableName = "`" + suite.db.NewID() + "`"
	suite.db.MustExec(fmt.Sprintf(`CREATE TABLE %s (
		a bigint,
		b double,
		c varchar(50),
		d timestamp(6),
		e datetime(6)
	)`, suite.tableName))
	suite.db.MustExec(fmt.Sprintf(`INSERT INTO %s VALUES (
		1633803684694123,
		1633803684.694123,
		"2021-10-09 18:21:24.694123",
		FROM_UNIXTIME("1633803684.694123"),
		"2021-10-09 18:21:24.694123"
	)`, suite.tableName))
}

func (suite *TimestampORMSuite) TearDownSuite() {
	suite.db.MustExec(fmt.Sprintf(`DROP TABLE IF EXISTS %s`, suite.tableName))
	suite.db.MustClose()
}

func (suite *TimestampORMSuite) SetupTest() {
	suite.db.MustExec("SET time_zone = '+00:00'")
}

func (suite *TimestampORMSuite) TestCheckFixture() {
	var row struct {
		C1 float64
		C2 float64
	}
	err := suite.db.Gorm().Table(suite.tableName).
		Select([]string{"UNIX_TIMESTAMP(d) AS C1", "UNIX_TIMESTAMP(e) AS C2"}).
		Find(&row).
		Error
	suite.Require().Nil(err)
	suite.Require().Equal(1633803684.694123, row.C1)
	suite.Require().Equal(1633803684.694123, row.C2)
}

func (suite *TimestampORMSuite) TestScanFromInt() {
	var r Timestamp
	err := suite.db.Gorm().Table(suite.tableName).Select("a").Take(&r).Error
	suite.Require().NotNil(err)
}

func (suite *TimestampORMSuite) TestScanFromDouble() {
	var r Timestamp
	err := suite.db.Gorm().Table(suite.tableName).Select("b").Take(&r).Error
	suite.Require().NotNil(err)
}

func (suite *TimestampORMSuite) TestScanFromString() {
	var r Timestamp
	err := suite.db.Gorm().Table(suite.tableName).Select("c").Take(&r).Error
	suite.Require().NotNil(err)
}

func (suite *TimestampORMSuite) TestScanFromTimestamp() {
	var r Timestamp

	// WARN: This test case shows that, even for "TIMESTAMP" field types, MySQL will transmit the value
	// in civil format (like Y-m-d H:m:s) and drop the timezone part. Then, if the go-mysql driver thinks
	// it's in UTC time zone then we will get the wrong result.
	// To ensure the result correctness for "TIMESTAMP" field types, the UTC time_zone must be enforced in both
	// driver side and database side.

	suite.db.MustExec("SET time_zone = '+08:00'")
	err := suite.db.Gorm().Table(suite.tableName).Select("d").Take(&r).Error
	suite.Require().Nil(err)
	suite.Require().Equal(int64(1633832484694123000), r.UnixNano())

	suite.db.MustExec("SET time_zone = '+00:00'")
	err = suite.db.Gorm().Table(suite.tableName).Select("d").Take(&r).Error
	suite.Require().Nil(err)
	suite.Require().Equal(int64(1633803684694123000), r.UnixNano())

	// Another safe way to deal with the TIMESTAMP is to use UNIX_TIMESTAMP function:
	suite.db.MustExec("SET time_zone = '+03:00'") // Session time zone doesn't matter
	var r2 float64
	err = suite.db.Gorm().Table(suite.tableName).Select("UNIX_TIMESTAMP(d)").Take(&r2).Error
	suite.Require().Nil(err)
	suite.Require().Equal(1633803684.694123, r2)
}

func (suite *TimestampORMSuite) TestScanFromDatetime() {
	var r Timestamp

	suite.db.MustExec("SET time_zone = '+08:00'")
	err := suite.db.Gorm().Table(suite.tableName).Select("e").Take(&r).Error
	suite.Require().Nil(err)
	// Note: MySQL return the "Y-m-d H:m:s" as it is, while the driver will treat it as in UTC.
	suite.Require().Equal(int64(1633803684694123000), r.UnixNano())

	suite.db.MustExec("SET time_zone = '+04:00'") // Session time zone doesn't matter.
	err = suite.db.Gorm().Table(suite.tableName).Select("e").Take(&r).Error
	suite.Require().Nil(err)
	suite.Require().Equal(int64(1633803684694123000), r.UnixNano())
}

// TestScanToGoTypes verifies different behaviours when scanning a MySQL TIMESTAMP field type into different
// Golang types.
func (suite *TimestampORMSuite) TestScanToGoTypes() {
	var r1 int
	err := suite.db.Gorm().Table(suite.tableName).Select("d").Take(&r1).Error
	suite.Require().NotNil(err)

	var r2 float64
	err = suite.db.Gorm().Table(suite.tableName).Select("d").Take(&r2).Error
	suite.Require().NotNil(err)

	// Scanning a TIMESTAMP field type into String is valid.
	var r3 string
	suite.db.MustExec("SET time_zone = '+00:00'")
	err = suite.db.Gorm().Table(suite.tableName).Select("d").Take(&r3).Error
	suite.Require().Nil(err)
	suite.Require().Equal("2021-10-09T18:21:24.694123Z", r3)

	suite.db.MustExec("SET time_zone = '+03:00'")
	err = suite.db.Gorm().Table(suite.tableName).Select("d").Take(&r3).Error
	suite.Require().Nil(err)
	suite.Require().Equal("2021-10-09T21:21:24.694123Z", r3)
}

func (suite *TimestampORMSuite) TestWhere() {
	var r Timestamp
	err := suite.db.Gorm().
		Table(suite.tableName).
		Select("d").
		Where("d = ?", Timestamp{Time: time.Unix(0, 1633803684694123000)}).
		Take(&r).Error
	suite.Require().Nil(err)
	suite.Require().Equal(int64(1633803684694123000), r.UnixNano())

	err = suite.db.Gorm().
		Table(suite.tableName).
		Select("d").
		Where("d > ?", Timestamp{Time: time.Unix(0, 1633803684694000000)}).
		Take(&r).Error
	suite.Require().Nil(err)
	suite.Require().Equal(int64(1633803684694123000), r.UnixNano())

	err = suite.db.Gorm().
		Table(suite.tableName).
		Select("d").
		Where("d = ?", Timestamp{Time: time.Unix(0, 1633803684694000000)}).
		Take(&r).Error
	suite.Require().NotNil(err)
	suite.Require().Equal(gorm.ErrRecordNotFound, err)

	err = suite.db.Gorm().
		Table(suite.tableName).
		Select("d").
		Where("d > ?", Timestamp{Time: time.Unix(0, 1633803684694123001)}).
		Take(&r).Error
	suite.Require().NotNil(err)
	suite.Require().Equal(gorm.ErrRecordNotFound, err)

	// It is also possible to specify string directly for a TIMESTAMP type.
	err = suite.db.Gorm().
		Table(suite.tableName).
		Select("d").
		Where("d = ?", "2021-10-09 18:21:24.694123").
		Take(&r).Error
	suite.Require().Nil(err)
	suite.Require().Equal(int64(1633803684694123000), r.UnixNano())
}

func (suite *TimestampORMSuite) TestWhereInIndex() {
	tableName := "`" + suite.db.NewID() + "`"

	suite.db.MustExec(fmt.Sprintf(`CREATE TABLE %s (
		id int,
		ts timestamp(6),
		INDEX idx (ts)
	)`, tableName))
	suite.db.MustExec(fmt.Sprintf(`INSERT INTO %s VALUES (
		1,
		FROM_UNIXTIME(1633880141.307801)
	)`, tableName))

	defer suite.db.MustExec(fmt.Sprintf(`DROP TABLE IF EXISTS %s`, tableName))

	var r Timestamp
	err := suite.db.Gorm().
		Table(tableName).
		Select("ts").
		Where("ts = ?", Timestamp{Time: time.Unix(0, 1633880141307801000)}).
		Take(&r).Error
	suite.Require().Nil(err)
	suite.Require().Equal(int64(1633880141307801000), r.UnixNano())

	// Verify Plan is Index Scan
	type explainRow struct {
		ID string `gorm:"column:id"`
	}
	var rows []explainRow
	err = suite.db.Gorm().Raw(
		fmt.Sprintf("EXPLAIN SELECT ts FROM %s WHERE ts = ?", tableName),
		Timestamp{Time: time.Unix(0, 1633880141307801000)}).Scan(&rows).Error
	suite.Require().Nil(err)
	suite.Require().Contains(rows[1].ID, "IndexRangeScan")
}

func (suite *TimestampORMSuite) TestInsert() {
	tableName := "`" + suite.db.NewID() + "`"

	suite.db.MustExec(fmt.Sprintf(`CREATE TABLE %s (
		id int,
		ts timestamp(6)
	)`, tableName))

	defer suite.db.MustExec(fmt.Sprintf(`DROP TABLE IF EXISTS %s`, tableName))

	type model struct {
		ID int
		Ts Timestamp
	}
	err := suite.db.Gorm().Table(tableName).Create(model{
		ID: 5,
		Ts: Timestamp{Time: time.Unix(0, 1633880957785123456)},
	}).Error
	suite.Require().Nil(err)

	var r model
	err = suite.db.Gorm().Table(tableName).Take(&r).Error
	suite.Require().Nil(err)
	suite.Require().Equal(5, r.ID)
	suite.Require().Equal(int64(1633880957785123000), r.Ts.UnixNano())
}

func (suite *TimestampORMSuite) TestScanNull() {
	tableName := "`" + suite.db.NewID() + "`"

	suite.db.MustExec(fmt.Sprintf(`CREATE TABLE %s (
		id int,
		ts timestamp(6)
	)`, tableName))
	suite.db.MustExec(fmt.Sprintf(`INSERT INTO %s VALUES (
		100,
		null
	)`, tableName))

	defer suite.db.MustExec(fmt.Sprintf(`DROP TABLE IF EXISTS %s`, tableName))

	var r Timestamp
	err := suite.db.Gorm().
		Table(tableName).
		Select("ts").
		Take(&r).Error
	suite.Require().Nil(err)
	suite.Require().Equal(int64(0), r.UnixNano())
}

func TestTimestampInORM(t *testing.T) {
	suite.Run(t, new(TimestampORMSuite))
}

func TestTimestampJSON(t *testing.T) {
	ts := Timestamp{Time: time.Unix(0, 1633880141307801631)}
	v, err := json.Marshal(ts)
	require.Nil(t, err)
	require.Equal(t, string(v), "1633880141307801")

	ts = Timestamp{Time: time.Unix(0, 500)}
	v, err = json.Marshal(ts)
	require.Nil(t, err)
	require.Equal(t, string(v), "0")

	st := struct {
		Foo Timestamp
	}{
		Foo: Timestamp{Time: time.Unix(0, 1633880141307801631)},
	}
	v, err = json.Marshal(st)
	require.Nil(t, err)
	require.Equal(t, string(v), `{"Foo":1633880141307801}`)

	var ts2 Timestamp
	err = json.Unmarshal([]byte("12345"), &ts2)
	require.Nil(t, err)
	require.Equal(t, int64(12345000), ts2.UnixNano())

	err = json.Unmarshal([]byte(`{"Foo":12345}`), &st)
	require.Nil(t, err)
	require.Equal(t, int64(12345000), st.Foo.UnixNano())

	err = json.Unmarshal([]byte(`{"Foo":"54321"}`), &st)
	require.NotNil(t, err)

	err = json.Unmarshal([]byte(`{"Foo":123.45}`), &st)
	require.NotNil(t, err)

	ts3 := Timestamp{Time: time.Unix(0, 1633880141307801000)}
	v, err = json.Marshal(ts3)
	require.Nil(t, err)
	err = json.Unmarshal(v, &ts2)
	require.Nil(t, err)
	require.Equal(t, ts2, ts3)
}
