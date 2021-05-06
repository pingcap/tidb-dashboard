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
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/tiflash"
	"github.com/pingcap/tidb-dashboard/pkg/tikv"
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

func newClientMap(tidbImpl tidbImplement, tikvImpl tikvImplement, tiflashImpl tiflashImplement, pdImpl pdImplement) *ClientMap {
	clientMap := ClientMap{
		model.NodeKindTiDB:    &tidbImpl,
		model.NodeKindTiKV:    &tikvImpl,
		model.NodeKindTiFlash: &tiflashImpl,
		model.NodeKindPD:      &pdImpl,
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

// TODO: tikv/tiflash/pd forwarder impl

type tikvImplement struct {
	fx.In
	Client *tikv.Client
}

func (impl *tikvImplement) Get(request *http.Request) ([]byte, error) {
	host := request.URL.Hostname()
	port, err := strconv.Atoi(request.URL.Port())
	if err != nil {
		return nil, err
	}

	return impl.Client.SendGetRequest(host, port, request.URL.Path)
}

type tiflashImplement struct {
	fx.In
	Client *tiflash.Client
}

func (impl *tiflashImplement) Get(request *http.Request) ([]byte, error) {
	host := request.URL.Hostname()
	port, err := strconv.Atoi(request.URL.Port())
	if err != nil {
		return nil, err
	}

	return impl.Client.SendGetRequest(host, port, request.URL.Path)
}

type pdImplement struct {
	fx.In
	Client *pd.Client
}

func (impl *pdImplement) Get(request *http.Request) ([]byte, error) {
	return impl.Client.SendGetRequest(request.URL.Path)
}
