// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

const (
	// The key that attached the TiDB connection in the gin Context.
	tiDBConnectionKey = "tidb"
)

// MWConnectTiDB creates a middleware that attaches TiDB connection to the context, according to the identity
// information attached in the context. If a connection cannot be established, subsequent handlers will be skipped
// and errors will be generated.
//
// This middleware must be placed after the `MWAuthRequired()` middleware, otherwise it will panic.
func MWConnectTiDB(tidbClient *tidb.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionUser := GetSession(c)
		if sessionUser == nil {
			panic("invalid sessionUser")
		}

		if !sessionUser.HasTiDBAuth {
			// Only TiDBAuth is able to access. Raise error in this case.
			// The error is privilege error instead of authorization error so that user will not be redirected.
			rest.Error(c, rest.ErrForbidden.NewWithNoMessage())
			c.Abort()
			return
		}

		db, err := tidbClient.OpenSQLConn(sessionUser.TiDBUsername, sessionUser.TiDBPassword)
		if err != nil {
			if errorx.IsOfType(err, tidb.ErrTiDBAuthFailed) {
				// If TiDB conn is ok when login but fail this time, it means TiDB credential has been changed since
				// login. In this case, we return unauthorized error, so that the front-end can let user to login again.
				rest.Error(c, rest.ErrUnauthenticated.NewWithNoMessage())
			} else {
				// For other kind of connection errors, for example, PD goes away, return these errors directly.
				// In front-end we will simply display these errors but not ask user to login again.
				rest.Error(c, err)
			}
			c.Abort()
			return
		}

		defer func() {
			// We allow tiDBConnectionKey to be cleared by `TakeTiDBConnection`.
			dbInContext := c.MustGet(tiDBConnectionKey)
			if dbInContext != nil {
				dbInContext2 := dbInContext.(*gorm.DB)
				if dbInContext2 != nil {
					_ = CloseTiDBConnection(dbInContext2)
				}
			}
		}()

		c.Set(tiDBConnectionKey, db)
		c.Next()
	}
}

// TakeTiDBConnection takes out the TiDB connection stored in the gin context by `MWConnectTiDB` middleware.
// Subsequent handlers in this context cannot access the TiDB connection any more.
//
// The TiDB connection will no longer be closed automatically after all handlers are finished. You must manually
// close the taken out connection.
func TakeTiDBConnection(c *gin.Context) *gorm.DB {
	db := GetTiDBConnection(c)
	c.Set(tiDBConnectionKey, nil)
	return db
}

func CloseTiDBConnection(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// GetTiDBConnection gets the TiDB connection stored in the gin context by `MWConnectTiDB` middleware.
//
// The connection will be closed automatically after all handlers are finished. Thus you must not use it outside
// the request lifetime. If you want to extend the lifetime, use `TakeTiDBConnection`.
func GetTiDBConnection(c *gin.Context) *gorm.DB {
	db := c.MustGet(tiDBConnectionKey).(*gorm.DB)
	return db
}
