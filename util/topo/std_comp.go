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

// Package topoutil provides utilities to read the component topology.
package topo

import (
	"context"
	"encoding/json"

	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/zap"
)

var (
	ErrNS                  = errorx.NewNamespace("topo_util")
	ErrEtcdRequestFailed   = ErrNS.NewType("etcd_request_failed")
	ErrInvalidTopologyData = ErrNS.NewType("invalid_topology_data")
)

func fetchStandardComponentTopology(ctx context.Context, componentName string, etcdClient *clientv3.Client) (*StandardComponentInfo, error) {
	key := "/topology/" + componentName
	resp, err := etcdClient.Get(ctx, key, clientv3.WithPrefix())
	if err != nil {
		return nil, ErrEtcdRequestFailed.Wrap(err, "Failed to read topology from etcd key `%s`", key)
	}
	if resp.Count == 0 {
		return nil, nil
	}
	info := StandardComponentInfo{}
	kv := resp.Kvs[0]
	if err = json.Unmarshal(kv.Value, &info); err != nil {
		log.Warn("Failed to unmarshal topology value",
			zap.String("key", string(kv.Key)),
			zap.String("value", string(kv.Value)))
		return nil, nil
	}
	return &info, nil
}
