// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package utils

import (
	"github.com/gin-gonic/gin"
	"github.com/jinzhu/gorm"
	"github.com/joomcode/errorx"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb"
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
func MWConnectTiDB(tidbForwarder *tidb.Forwarder) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionUser := c.MustGet(SessionUserKey).(*SessionUser)
		if sessionUser == nil {
			panic("invalid sessionUser")
		}

		if !sessionUser.IsTiDBAuth {
			// Only TiDBAuth is able to access. Raise error in this case.
			// The error is privilege error instead of authorization error so that user will not be redirected.
			MakeInsufficientPrivilegeError(c)
			c.Abort()
			return
		}

		db, err := tidbForwarder.OpenTiDB(sessionUser.TiDBUsername, sessionUser.TiDBPassword)

		if err != nil {
			if errorx.IsOfType(err, tidb.ErrTiDBAuthFailed) {
				// If TiDB conn is ok when login but fail this time, it means TiDB credential has been changed since
				// login. In this case, we return unauthorized error, so that the front-end can let user to login again.
				MakeUnauthorizedError(c)
			} else {
				// For other kind of connection errors, for example, PD goes away, return these errors directly.
				// In front-end we will simply display these errors but not ask user to login again.
				c.Status(500)
				_ = c.Error(err)
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
					_ = dbInContext2.Close()
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

// GetTiDBConnection gets the TiDB connection stored in the gin context by `MWConnectTiDB` middleware.
//
// The connection will be closed automatically after all handlers are finished. Thus you must not use it outside
// the request lifetime. If you want to extend the lifetime, use `TakeTiDBConnection`.
func GetTiDBConnection(c *gin.Context) *gorm.DB {
	db := c.MustGet(tiDBConnectionKey).(*gorm.DB)
	return db
}
