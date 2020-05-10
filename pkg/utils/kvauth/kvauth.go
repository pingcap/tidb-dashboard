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
	"errors"
	"time"

	"github.com/gtank/cryptopasta"
	"go.etcd.io/etcd/clientv3"
)

const etcdKvAuthKeyPath = "/dashboard/kv_auth"

// RevokeKvAuthKey delete the etcd path of KV mode user account
func RevokeKvAuthKey(etcdClient *clientv3.Client) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()
	_, err := etcdClient.Delete(ctx, etcdKvAuthKeyPath)
	return err
}

// VerifyKvAuthKey get hashed pass from etcd and check
func VerifyKvAuthKey(etcdClient *clientv3.Client, authKey string) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	path := etcdKvAuthKeyPath
	hashedPass := []byte("")
	resp, err := etcdClient.Get(ctx, path)
	if err != nil {
		return err
	}
	for _, kv := range resp.Kvs {
		hashedPass = kv.Value
	}

	if string(hashedPass) == "" {
		return errors.New("set auth key before verify")
	}

	return cryptopasta.CheckPasswordHash(hashedPass, []byte(authKey))
}

// ResetKvAuthKey set new auth key to etcd
func ResetKvAuthKey(etcdClient *clientv3.Client, authKey string) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	hashedPass, err := cryptopasta.HashPassword([]byte(authKey))
	if err != nil {
		return err
	}
	_, err = etcdClient.Put(ctx, etcdKvAuthKeyPath, string(hashedPass))
	return err
}
