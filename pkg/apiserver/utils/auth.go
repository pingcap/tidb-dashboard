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
	"bytes"
	"encoding/gob"
	"encoding/hex"
	"time"

	"github.com/gtank/cryptopasta"
)

type SessionUser struct {
	HasTiDBAuth  bool
	TiDBUsername string
	TiDBPassword string

	// Whether this session is shared, i.e. built from another existing session.
	// For security consideration, we do not allow shared session to be shared again
	// since sharing can extend session lifetime.
	IsShared bool

	// TODO: Add privilege table fields
}

const (
	// The key that attached the SessionUser in the gin Context.
	SessionUserKey = "user"

	// Max permitted lifetime of a shared session.
	MaxSessionShareExpiry = time.Hour * 24
)

// The secret is always regenerated each time starting TiDB Dashboard.
var sharingCodeSecret = cryptopasta.NewEncryptionKey()

type sharedSession struct {
	Session  *SessionUser
	ExpireAt time.Time
}

func (session *SessionUser) ToSharingCode(expireIn time.Duration) *string {
	if session.IsShared {
		return nil
	}
	if expireIn < 0 {
		return nil
	}
	if expireIn > MaxSessionShareExpiry {
		return nil
	}

	shared := sharedSession{
		Session:  session,
		ExpireAt: time.Now().Add(expireIn),
	}

	var b bytes.Buffer
	e := gob.NewEncoder(&b)
	if err := e.Encode(shared); err != nil {
		// Do not output anything about how serialization is failed to avoid potential leaks.
		return nil
	}

	encrypted, err := cryptopasta.Encrypt(b.Bytes(), sharingCodeSecret)
	if err != nil {
		return nil
	}
	codeInHex := hex.EncodeToString(encrypted)
	return &codeInHex
}

func NewSessionFromSharingCode(codeInHex string) *SessionUser {
	encrypted, err := hex.DecodeString(codeInHex)
	if err != nil {
		return nil
	}

	b, err := cryptopasta.Decrypt(encrypted, sharingCodeSecret)
	if err != nil {
		return nil
	}

	var shared sharedSession
	d := gob.NewDecoder(bytes.NewBuffer(b))
	if err := d.Decode(&shared); err != nil {
		return nil
	}

	if time.Now().After(shared.ExpireAt) {
		return nil
	}

	shared.Session.IsShared = true
	return shared.Session
}
