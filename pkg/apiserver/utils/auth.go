// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

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
