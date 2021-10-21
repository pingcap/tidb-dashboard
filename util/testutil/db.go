package testutil

import (
	"encoding/hex"
	"testing"
	"time"

	mysqldriver "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
	"github.com/pingcap/log"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"moul.io/zapgorm2"
)

type TestDB struct {
	inner *gorm.DB
	t     *testing.T
}

func OpenTestDB(t *testing.T) *TestDB {
	dsn := mysqldriver.NewConfig()
	dsn.Net = "tcp"
	dsn.Addr = "127.0.0.1:4000"
	dsn.Params = map[string]string{"time_zone": "'+00:00'"}
	dsn.ParseTime = true
	dsn.Loc = time.UTC
	dsn.User = "root"
	dsn.DBName = "test"

	db, err := gorm.Open(mysql.Open(dsn.FormatDSN()), &gorm.Config{
		Logger: zapgorm2.New(log.L()),
	})
	require.Nil(t, err)
	return &TestDB{inner: db.Debug(), t: t}
}

func (db *TestDB) MustClose() {
	d, err := db.inner.DB()
	require.Nil(db.t, err)

	err = d.Close()
	require.Nil(db.t, err)
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
	require.Nil(db.t, err)
}
