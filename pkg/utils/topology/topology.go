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
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/zap"
)

var (
	ErrNS                  = errorx.NewNamespace("error.topology")
	ErrPDAccessFailed      = ErrNS.NewType("pd_access_failed")
	ErrInvalidTopologyData = ErrNS.NewType("invalid_topology_data")
)

const defaultFetchTimeout = 2 * time.Second

// address should be like "ip:port" as "127.0.0.1:2379".
// return error if string is not like "ip:port".
func parseHostAndPortFromAddress(address string) (string, uint, error) {
	addresses := strings.Split(address, ":")
	if len(addresses) != 2 {
		return "", 0, fmt.Errorf("invalid address %s", address)
	}
	port, err := strconv.Atoi(addresses[1])
	if err != nil {
		return "", 0, err
	}
	return addresses[0], uint(port), nil
}

// address should be like "protocol://ip:port" as "http://127.0.0.1:2379".
func parseHostAndPortFromAddressURL(urlString string) (string, uint, error) {
	u, err := url.Parse(urlString)
	if err != nil {
		return "", 0, err
	}
	port, err := strconv.Atoi(u.Port())
	if err != nil {
		return "", 0, err
	}
	return u.Hostname(), uint(port), nil
}

func fetchStandardComponentTopology(componentName string, etcdClient *clientv3.Client) (*StandardComponentInfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), defaultFetchTimeout)
	defer cancel()

	key := "/topology/" + componentName
	resp, err := etcdClient.Get(ctx, key, clientv3.WithPrefix())
	if err != nil {
		return nil, ErrPDAccessFailed.New("PD etcd get key %s failed", key)
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
