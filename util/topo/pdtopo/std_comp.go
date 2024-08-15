// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package pdtopo

import (
	"context"
	"encoding/json"

	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/topo"
)

var (
	ErrNS                  = errorx.NewNamespace("topo.pd")
	ErrEtcdRequestFailed   = ErrNS.NewType("etcd_request_failed")
	ErrInvalidTopologyData = ErrNS.NewType("invalid_topology_data")
)

func fetchStandardComponentTopology(ctx context.Context, componentName string, etcdClient *clientv3.Client) (*topo.StandardDeployInfo, error) {
	key := "/topology/" + componentName
	resp, err := etcdClient.Get(ctx, key, clientv3.WithPrefix())
	if err != nil {
		return nil, ErrEtcdRequestFailed.Wrap(err, "Failed to read topology from etcd key `%s`", key)
	}
	if resp.Count == 0 {
		return nil, nil
	}
	info := topo.StandardDeployInfo{}
	kv := resp.Kvs[0]
	if err = json.Unmarshal(kv.Value, &info); err != nil {
		log.Warn("Failed to unmarshal topology value",
			zap.String("key", string(kv.Key)),
			zap.String("value", string(kv.Value)))
		return nil, nil
	}
	return &info, nil
}
