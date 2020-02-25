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

	"go.etcd.io/etcd/clientv3"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

const (
	EtcdTimeout               = time.Second * 3
	TiDBServerInformationPath = "/tidb/server/info"
)

var _ EtcdProvider = (*LocalEtcdProvider)(nil)

type EtcdProvider interface {
	GetEtcdClient() *clientv3.Client
}

// FIXME: We should be able to provide etcd directly. However currently there are problems in PD.
type LocalEtcdProvider struct {
	client *clientv3.Client
}

func NewLocalEtcdClientProvider(config *config.Config) (*LocalEtcdProvider, error) {
	client, err := clientv3.New(clientv3.Config{
		Endpoints:   []string{config.PDEndPoint},
		DialTimeout: EtcdTimeout,
		TLS:         config.TLSConfig,
	})
	if err != nil {
		return nil, err
	}
	return &LocalEtcdProvider{client: client}, nil
}

func (p *LocalEtcdProvider) GetEtcdClient() *clientv3.Client {
	return p.client
}
