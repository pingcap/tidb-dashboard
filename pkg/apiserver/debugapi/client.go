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
	"context"
	"fmt"
	"time"

	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/endpoint"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/tiflash"
	"github.com/pingcap/tidb-dashboard/pkg/tikv"
	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
	"github.com/thoas/go-funk"
)

const (
	defaultTimeout = time.Second * 35 // Default profiling can be as long as 30s. Add 5 seconds for other overheads.
)

type Dispatcher struct {
	endpoint.Dispatcher
	clients ClientMap
}

type ClientMap map[model.NodeKind]Client

type Client interface {
	Get(request *endpoint.Request) (*httpc.Response, error)
	CheckDest(host string, port int) (bool, error)
}

type param struct {
	fx.In
	TidbImpl    tidbImplement
	TikvImpl    tikvImplement
	TiflashImpl tiflashImplement
	PDImpl      pdImplement
}

func newDispatcher(p param) *Dispatcher {
	return &Dispatcher{
		clients: ClientMap{
			model.NodeKindTiDB:    &p.TidbImpl,
			model.NodeKindTiKV:    &p.TikvImpl,
			model.NodeKindTiFlash: &p.TiflashImpl,
			model.NodeKindPD:      &p.PDImpl,
		},
	}
}

func (d *Dispatcher) Send(req *endpoint.Request) (*httpc.Response, error) {
	if req.Timeout <= 0 {
		req.Timeout = defaultTimeout
	}
	c := d.clients[req.Component]

	isValid, err := c.CheckDest(req.Host, req.Port)
	if !isValid {
		return nil, fmt.Errorf("invalid request destation: %s:%d", req.Host, req.Port)
	}
	if err != nil {
		return nil, err
	}

	switch req.Method {
	case endpoint.MethodGet:
		return c.Get(req)
	default:
		return nil, fmt.Errorf("invalid request method `%s`, host: %s, path: %s", req.Method, req.Host, req.Path())
	}
}

func buildRelativeURI(path string, query string) string {
	if len(query) == 0 {
		return path
	}
	return fmt.Sprintf("%s?%s", path, query)
}

type tidbImplement struct {
	fx.In
	Client     *tidb.Client
	EtcdClient *clientv3.Client
}

func (impl *tidbImplement) Get(req *endpoint.Request) (*httpc.Response, error) {
	return impl.Client.
		WithEnforcedStatusAPIAddress(req.Host, req.Port).
		WithStatusAPITimeout(req.Timeout).
		Get(buildRelativeURI(req.Path(), req.Query()))
}

func (impl *tidbImplement) CheckDest(host string, port int) (bool, error) {
	info, err := topology.FetchTiDBTopology(context.Background(), impl.EtcdClient)
	if err != nil {
		return false, err
	}
	return funk.Contains(info, func(item topology.TiDBInfo) bool {
		return item.IP == host && item.StatusPort == uint(port)
	}), nil
}

type tikvImplement struct {
	fx.In
	Client   *tikv.Client
	PDClient *pd.Client
}

func (impl *tikvImplement) Get(req *endpoint.Request) (*httpc.Response, error) {
	return impl.Client.
		WithTimeout(req.Timeout).
		Get(req.Host, req.Port, buildRelativeURI(req.Path(), req.Query()))
}

func (impl *tikvImplement) CheckDest(host string, port int) (bool, error) {
	info, _, err := topology.FetchStoreTopology(impl.PDClient)
	if err != nil {
		return false, err
	}
	return funk.Contains(info, func(item topology.StoreInfo) bool {
		return item.IP == host && item.StatusPort == uint(port)
	}), nil
}

type tiflashImplement struct {
	fx.In
	Client   *tiflash.Client
	PDClient *pd.Client
}

func (impl *tiflashImplement) Get(req *endpoint.Request) (*httpc.Response, error) {
	return impl.Client.
		WithTimeout(req.Timeout).
		Get(req.Host, req.Port, buildRelativeURI(req.Path(), req.Query()))
}

func (impl *tiflashImplement) CheckDest(host string, port int) (bool, error) {
	_, info, err := topology.FetchStoreTopology(impl.PDClient)
	if err != nil {
		return false, err
	}
	return funk.Contains(info, func(item topology.StoreInfo) bool {
		return item.IP == host && item.StatusPort == uint(port)
	}), nil
}

type pdImplement struct {
	fx.In
	Client *pd.Client
}

func (impl *pdImplement) Get(req *endpoint.Request) (*httpc.Response, error) {
	return impl.Client.
		WithAddress(req.Host, req.Port).
		WithTimeout(req.Timeout).
		Get(buildRelativeURI(req.Path(), req.Query()))
}

func (impl *pdImplement) CheckDest(host string, port int) (bool, error) {
	info, err := topology.FetchPDTopology(impl.Client)
	if err != nil {
		return false, err
	}
	return funk.Contains(info, func(item topology.PDInfo) bool {
		return item.IP == host && item.Port == uint(port)
	}), nil
}
