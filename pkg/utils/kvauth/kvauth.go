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
	"time"

	"github.com/joomcode/errorx"

	"github.com/gtank/cryptopasta"
	"go.etcd.io/etcd/clientv3"
)

const etcdKvAuthKeyPath = "/dashboard/kv_auth"

var (
	ErrNS              = errorx.NewNamespace("error.kvauth")
	ErrAccountNotFound = ErrNS.NewType("account_not_found")
)

// RevokeKvAuthKey delete the etcd path of KV mode user account
func RevokeKvAuthKey(etcdClient *clientv3.Client, username string) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()
	path := etcdKvAuthKeyPath + "/" + username
	_, err := etcdClient.Delete(ctx, path)
	return err
}

// VerifyKvAuthKey get hashed pass from etcd and check
func VerifyKvAuthKey(etcdClient *clientv3.Client, username string, authKey string) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	path := etcdKvAuthKeyPath + "/" + username
	hashedPass := []byte("")
	resp, err := etcdClient.Get(ctx, path)
	if err != nil {
		return err
	}

	if len(resp.Kvs) == 0 {
		return ErrAccountNotFound.NewWithNoMessage()
	}

	for _, kv := range resp.Kvs {
		hashedPass = kv.Value
	}

	return cryptopasta.CheckPasswordHash(hashedPass, []byte(authKey))
}

// ResetKvAuthKey set new auth key to etcd
func ResetKvAuthKey(etcdClient *clientv3.Client, username string, password string) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	hashedPass, err := cryptopasta.HashPassword([]byte(password))
	if err != nil {
		return err
	}

	path := etcdKvAuthKeyPath + "/" + username
	_, err = etcdClient.Put(ctx, path, string(hashedPass))
	return err
}
