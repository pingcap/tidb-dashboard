// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

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
