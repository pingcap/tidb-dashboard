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
	"context"
	"github.com/gtank/cryptopasta"
	"go.etcd.io/etcd/clientv3"
	"time"
)

const EtcdInternalAccountsPath = "/dashboard/internal_accounts"

func ClearInternalAccount(etcdClient *clientv3.Client, username string) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()
	_, err := etcdClient.Delete(ctx, EtcdInternalAccountsPath+username)
	return err
}

func VerifyInternalAccount(etcdClient *clientv3.Client, username string, password string) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	path := EtcdInternalAccountsPath + username
	hashedPass := []byte("")
	resp, err := etcdClient.Get(ctx, path)
	if err != nil {
		return err
	}
	for _, kv := range resp.Kvs {
		hashedPass = kv.Value
	}

	return cryptopasta.CheckPasswordHash(hashedPass, []byte(password))
}

func ResetInternalAccount(etcdClient *clientv3.Client, username string, password string) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	hashedPass, err := cryptopasta.HashPassword([]byte(password))
	if err != nil {
		return err
	}
	_, err = etcdClient.Put(ctx, EtcdInternalAccountsPath+username, string(hashedPass))
	return err
}
