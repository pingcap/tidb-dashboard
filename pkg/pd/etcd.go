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

package pd

import (
	"time"

	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

const (
	EtcdTimeout               = time.Second * 3
	TiDBServerInformationPath = "/tidb/server/region"
)

func NewEtcdClient(cfg *config.Config) *clientv3.Client {
	client, err := clientv3.New(clientv3.Config{
		Endpoints:   []string{cfg.PDEndPoint},
		DialTimeout: EtcdTimeout,
		TLS:         cfg.TLSConfig,
	})
	if err != nil {
		log.Error("can not get etcd client", zap.Error(err))
		panic(err)
	}
	return client
}
