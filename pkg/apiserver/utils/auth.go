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
	"time"

	"github.com/gin-gonic/gin"
)

type AuthType int

const SessionVersion = 2

// The content of this structure will be encrypted and stored as both Session Token and Sharing Token.
// For fields that don't need to be cloned during session sharing, mark fields as `msgpack:"-"`.
type SessionUser struct {
	// Must be 2. This field is used to invalidate outdated sessions after schema change.
	Version int

	DisplayName string

	HasTiDBAuth  bool
	TiDBUsername string
	TiDBPassword string

	// This field only exists for CodeAuth.
	SharedSessionExpireAt time.Time `msgpack:"-" json:",omitempty"`

	// This field only exists for SSOAuth
	OIDCIDToken string `json:",omitempty"`

	// These fields should not be updated by individual authenticators.
	AuthFrom AuthType `msgpack:"-" json:",omitempty"`

	// TODO: Make them table fields
	IsShareable bool
	IsWriteable bool
}

const (
	// The key that attached the SessionUser in the gin Context.
	SessionUserKey = "user"
)

func GetSession(c *gin.Context) *SessionUser {
	i, ok := c.Get(SessionUserKey)
	if !ok {
		return nil
	}
	return i.(*SessionUser)
}
