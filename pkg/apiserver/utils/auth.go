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
	"net/http"

	"github.com/gin-gonic/gin"
)

type SessionUser struct {
	IsTiDBAuth   bool
	TiDBUsername string
	TiDBPassword string
	// TODO: Add privilege table fields
}

const (
	// The key that attached the SessionUser in the gin Context.
	SessionUserKey = "user"
)

func MakeUnauthorizedError(c *gin.Context) {
	_ = c.Error(ErrUnauthorized.NewWithNoMessage())
	c.Status(http.StatusUnauthorized)
}

func MakeInsufficientPrivilegeError(c *gin.Context) {
	_ = c.Error(ErrInsufficientPrivilege.NewWithNoMessage())
	c.Status(http.StatusForbidden)
}
