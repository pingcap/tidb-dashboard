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

package topology

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"github.com/pingcap/tidb-dashboard/pkg/utils/distro"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/zap"
)

var (
	ErrNS                  = errorx.NewNamespace("error.topology")
	ErrEtcdRequestFailed   = ErrNS.NewType(fmt.Sprintf("%s_etcd_request_failed", strings.ToLower(distro.Data.PD)))
	ErrInvalidTopologyData = ErrNS.NewType("invalid_topology_data")
)

const defaultFetchTimeout = 2 * time.Second

func fetchStandardComponentTopology(ctx context.Context, componentName string, etcdClient *clientv3.Client) (*StandardComponentInfo, error) {
	ctx2, cancel := context.WithTimeout(ctx, defaultFetchTimeout)
	defer cancel()

	key := "/topology/" + componentName
	resp, err := etcdClient.Get(ctx2, key, clientv3.WithPrefix())
	if err != nil {
		return nil, ErrEtcdRequestFailed.Wrap(err, "failed to get key %s from %s etcd", key, distro.Data.PD)
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
