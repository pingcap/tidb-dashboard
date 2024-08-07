// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package topology

import (
	"context"
	"encoding/json"
	"time"

	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/distro"
)

var (
	ErrNS                  = errorx.NewNamespace("error.topology")
	ErrEtcdRequestFailed   = ErrNS.NewType("pd_etcd_request_failed")
	ErrInvalidTopologyData = ErrNS.NewType("invalid_topology_data")
	ErrInstanceNotAlive    = ErrNS.NewType("instance_not_alive")
)

const defaultFetchTimeout = 2 * time.Second

func fetchStandardComponentTopology(ctx context.Context, componentName string, etcdClient *clientv3.Client) (*StandardComponentInfo, error) {
	ctx2, cancel := context.WithTimeout(ctx, defaultFetchTimeout)
	defer cancel()

	key := "/topology/" + componentName
	resp, err := etcdClient.Get(ctx2, key, clientv3.WithPrefix())
	if err != nil {
		return nil, ErrEtcdRequestFailed.Wrap(err, "failed to get key %s from %s etcd", key, distro.R().PD)
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
