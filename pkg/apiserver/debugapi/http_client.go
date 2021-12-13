// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package debugapi

import (
	"fmt"
	"time"

	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/endpoint"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/tiflash"
	"github.com/pingcap/tidb-dashboard/pkg/tikv"
)

const (
	defaultTimeout = time.Second * 35 // Default profiling can be as long as 30s. Add 5 seconds for other overheads.
)

type HTTPClient struct {
	endpoint.HTTPClient
	clients ClientMap
}

type ClientMap map[model.NodeKind]Client

type Client interface {
	Get(payload *endpoint.ResolvedRequestPayload) (*httpc.Response, error)
}

type httpClientParam struct {
	fx.In
	TidbImpl    tidbImplement
	TikvImpl    tikvImplement
	TiflashImpl tiflashImplement
	PDImpl      pdImplement
}

func newHTTPClient(p httpClientParam) *HTTPClient {
	return &HTTPClient{
		clients: ClientMap{
			model.NodeKindTiDB:    &p.TidbImpl,
			model.NodeKindTiKV:    &p.TikvImpl,
			model.NodeKindTiFlash: &p.TiflashImpl,
			model.NodeKindPD:      &p.PDImpl,
		},
	}
}

func (d *HTTPClient) Fetch(payload *endpoint.ResolvedRequestPayload) (*httpc.Response, error) {
	if payload.Timeout <= 0 {
		payload.Timeout = defaultTimeout
	}
	c := d.clients[payload.Component]

	switch payload.Method {
	case endpoint.MethodGet:
		return c.Get(payload)
	default:
		return nil, fmt.Errorf("invalid request method `%s`, host: %s, path: %s", payload.Method, payload.Host, payload.Path())
	}
}

type tidbImplement struct {
	fx.In
	Client *tidb.Client
}

func (impl *tidbImplement) Get(payload *endpoint.ResolvedRequestPayload) (*httpc.Response, error) {
	return impl.Client.
		WithEnforcedStatusAPIAddress(payload.Host, payload.Port).
		WithStatusAPITimeout(payload.Timeout).
		Get(fmt.Sprintf("%s?%s", payload.Path(), payload.Query()))
}

type tikvImplement struct {
	fx.In
	Client *tikv.Client
}

func (impl *tikvImplement) Get(payload *endpoint.ResolvedRequestPayload) (*httpc.Response, error) {
	return impl.Client.
		WithTimeout(payload.Timeout).
		Get(payload.Host, payload.Port, fmt.Sprintf("%s?%s", payload.Path(), payload.Query()))
}

type tiflashImplement struct {
	fx.In
	Client *tiflash.Client
}

func (impl *tiflashImplement) Get(payload *endpoint.ResolvedRequestPayload) (*httpc.Response, error) {
	return impl.Client.
		WithTimeout(payload.Timeout).
		Get(payload.Host, payload.Port, fmt.Sprintf("%s?%s", payload.Path(), payload.Query()))
}

type pdImplement struct {
	fx.In
	Client *pd.Client
}

func (impl *pdImplement) Get(payload *endpoint.ResolvedRequestPayload) (*httpc.Response, error) {
	return impl.Client.
		WithAddress(payload.Host, payload.Port).
		WithTimeout(payload.Timeout).
		Get(fmt.Sprintf("%s?%s", payload.Path(), payload.Query()))
}
