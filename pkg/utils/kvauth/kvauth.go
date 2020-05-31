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

package kvauth

import (
	"context"
	"encoding/json"
	"time"

	"github.com/joomcode/errorx"

	"github.com/gtank/cryptopasta"
	"go.etcd.io/etcd/clientv3"
)

const etcdKvAuthKeyPath = "/dashboard/kv_auth"

var (
	ErrNS               = errorx.NewNamespace("error.kvauth")
	ErrAccountNotFound  = ErrNS.NewType("account_not_found")
	ErrPasswordNotMatch = ErrNS.NewType("password_not_match")
)

type Auth struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// RevokeKvAuthAccount revokes the KV mode user account stored in etcd.
func RevokeKvAuthAccount(etcdClient *clientv3.Client) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()
	_, err := etcdClient.Delete(ctx, etcdKvAuthKeyPath)
	return err
}

// VerifyKvAuthAccount verify the KV mode user account and  pass stored in etcd.
func VerifyKvAuthAccount(etcdClient *clientv3.Client, username string, password string) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	content := []byte("")
	resp, err := etcdClient.Get(ctx, etcdKvAuthKeyPath)
	if err != nil {
		return err
	}

	if len(resp.Kvs) == 0 {
		return ErrAccountNotFound.NewWithNoMessage()
	}

	for _, kv := range resp.Kvs {
		content = kv.Value
	}

	var auth Auth
	err = json.Unmarshal(content, &auth)
	if err != nil {
		return err
	}

	if auth.Username != username {
		return ErrAccountNotFound.NewWithNoMessage()
	}

	err = cryptopasta.CheckPasswordHash([]byte(auth.Password), []byte(password))
	if err != nil {
		return ErrPasswordNotMatch.NewWithNoMessage()
	}

	return nil
}

// ResetKvAuthAccount reset the KV mode user account stored in etcd.
func ResetKvAuthAccount(etcdClient *clientv3.Client, username string, password string) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	hashedPass, err := cryptopasta.HashPassword([]byte(password))
	if err != nil {
		return err
	}

	auth := Auth{
		Username: username,
		Password: string(hashedPass),
	}

	content, err := json.Marshal(auth)
	if err != nil {
		return err
	}

	_, err = etcdClient.Put(ctx, etcdKvAuthKeyPath, string(content))
	return err
}
