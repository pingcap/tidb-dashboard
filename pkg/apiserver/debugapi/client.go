// Copyright 2021 PingCAP, Inc.
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

package debugapi

import (
	"net/http"
	"strconv"

	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
)

type Client interface {
	Get(request *http.Request) ([]byte, error)
}

type ClientMap map[model.NodeKind]Client

func (c *ClientMap) Get(kind model.NodeKind) (Client, bool) {
	client, ok := (*c)[kind]
	return client, ok
}

func (c *ClientMap) Set(kind model.NodeKind, client Client) {
	(*c)[kind] = client
}

func newClientMap(tidbImpl tidbImplement) *ClientMap {
	clientMap := ClientMap{
		model.NodeKindTiDB: &tidbImpl,
	}
	return &clientMap
}

type tidbImplement struct {
	fx.In
	Client *tidb.Client
}

func (impl *tidbImplement) Get(request *http.Request) ([]byte, error) {
	host := request.URL.Hostname()
	port, err := strconv.Atoi(request.URL.Port())
	if err != nil {
		return nil, err
	}

	return impl.Client.WithEnforced(tidb.EnforcedSettingStatusAPIAddress).WithStatusAPIAddress(host, port).SendGetRequest(request.URL.Path)
}
