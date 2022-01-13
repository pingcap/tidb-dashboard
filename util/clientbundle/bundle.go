// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package clientbundle

import (
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/client/pdclient"
	"github.com/pingcap/tidb-dashboard/util/client/tidbclient"
	"github.com/pingcap/tidb-dashboard/util/client/tiflashclient"
	"github.com/pingcap/tidb-dashboard/util/client/tikvclient"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

type HTTPClientBundle struct {
	fx.In
	PDAPIClient         *pdclient.APIClient
	TiDBStatusClient    *tidbclient.StatusClient
	TiKVStatusClient    *tikvclient.StatusClient
	TiFlashStatusClient *tiflashclient.StatusClient
}

func (c HTTPClientBundle) GetHTTPClientByComponentKind(kind topo.Kind) *httpclient.Client {
	switch kind {
	case topo.KindPD:
		if c.PDAPIClient == nil {
			return nil
		}
		return c.PDAPIClient.Client
	case topo.KindTiDB:
		if c.TiDBStatusClient == nil {
			return nil
		}
		return c.TiDBStatusClient.Client
	case topo.KindTiKV:
		if c.TiKVStatusClient == nil {
			return nil
		}
		return c.TiKVStatusClient.Client
	case topo.KindTiFlash:
		if c.TiFlashStatusClient == nil {
			return nil
		}
		return c.TiFlashStatusClient.Client
	default:
		return nil
	}
}
