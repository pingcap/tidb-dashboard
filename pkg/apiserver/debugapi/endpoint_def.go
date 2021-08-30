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
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/pingcap/kvproto/pkg/metapb"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/endpoint"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

var pprofKindsParam = &endpoint.APIParam{
	Model: endpoint.APIParamModelEnum([]endpoint.EnumItem{
		{Name: "allocs"},
		{Name: "block"},
		{Name: "cmdline"},
		{Name: "goroutine"},
		{Name: "heap"},
		{Name: "mutex"},
		{Name: "profile"},
		{Name: "threadcreate"},
		{Name: "trace"},
	}),
	Name: "kind", Required: true,
}

var pprofSecondsParam = &endpoint.APIParam{
	Model: endpoint.APIParamModelEnum([]endpoint.EnumItem{
		{Name: "10s", Value: "10"},
		{Name: "30s", Value: "30"},
		{Name: "60s", Value: "60"},
		{Name: "120s", Value: "120"},
	}),
	Name: "seconds",
}

func timeoutMiddleware(req *endpoint.Request, sec string) error {
	i, err := strconv.ParseInt(sec, 10, 64)
	if err != nil {
		return err
	}
	duration := time.Duration(i) * time.Second
	req.Timeout = duration + duration/2
	return nil
}

func registerEndpoints(c *endpoint.Client) {
	// tidb
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tidb_stats_dump",
		Component: model.NodeKindTiDB,
		Path:      "/stats/dump/{db}/{table}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelDB, Name: "db", Required: true},
			{Model: endpoint.APIParamModelTable, Name: "table", Required: true},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tidb_stats_dump_timestamp",
		Component: model.NodeKindTiDB,
		Path:      "/stats/dump/{db}/{table}/{yyyyMMddHHmmss}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelDB, Name: "db", Required: true},
			{Model: endpoint.APIParamModelTable, Name: "table", Required: true},
			{Model: endpoint.APIParamModelText, Name: "yyyyMMddHHmmss", Required: true},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tidb_config",
		Component: model.NodeKindTiDB,
		Path:      "/settings",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tidb_schema",
		Component: model.NodeKindTiDB,
		Path:      "/schema",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelTableID, Name: "table_id"},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tidb_schema_db",
		Component: model.NodeKindTiDB,
		Path:      "/schema/{db}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelDB, Name: "db", Required: true},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tidb_schema_db_table",
		Component: model.NodeKindTiDB,
		Path:      "/schema/{db}/{table}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelDB, Name: "db", Required: true},
			{Model: endpoint.APIParamModelTable, Name: "table", Required: true},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tidb_dbtable_tableid",
		Component: model.NodeKindTiDB,
		Path:      "/db-table/{tableID}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelTableID, Name: "tableID", Required: true},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tidb_ddl_history",
		Component: model.NodeKindTiDB,
		Path:      "/ddl/history",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tidb_info",
		Component: model.NodeKindTiDB,
		Path:      "/info",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tidb_info_all",
		Component: model.NodeKindTiDB,
		Path:      "/info/all",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tidb_regions_meta",
		Component: model.NodeKindTiDB,
		Path:      "/regions/meta",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tidb_region_id",
		Component: model.NodeKindTiDB,
		Path:      "/regions/{regionID}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelText, Name: "regionID", Required: true},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tidb_table_regions",
		Component: model.NodeKindTiDB,
		Path:      "/tables/{db}/{table}/regions",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelDB, Name: "db", Required: true},
			{Model: endpoint.APIParamModelTable, Name: "table", Required: true},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tidb_hot_regions",
		Component: model.NodeKindTiDB,
		Path:      "/regions/hot",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tidb_pprof",
		Component: model.NodeKindTiDB,
		Path:      "/debug/pprof/{kind}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			pprofKindsParam,
		},
		QueryParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelConstant("1"), Name: "debug"},
			pprofSecondsParam,
		},
	}, endpoint.MiddlewareHandlerFunc(func(req *endpoint.Request) error {
		return timeoutMiddleware(req, req.QueryValues.Get("seconds"))
	}))

	// pd endpoints
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_cluster",
		Component: model.NodeKindPD,
		Path:      "/cluster",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_cluster_status",
		Component: model.NodeKindPD,
		Path:      "/cluster/status",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_config_show_all",
		Component: model.NodeKindPD,
		Path:      "/config",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_health",
		Component: model.NodeKindPD,
		Path:      "/health",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_hot_read",
		Component: model.NodeKindPD,
		Path:      "/hotspot/regions/read",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_hot_write",
		Component: model.NodeKindPD,
		Path:      "/hotspot/regions/write",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_hot_stores",
		Component: model.NodeKindPD,
		Path:      "/hotspot/stores",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_labels",
		Component: model.NodeKindPD,
		Path:      "/labels",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_label_stores",
		Component: model.NodeKindPD,
		Path:      "/labels/stores",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelText, Name: "name", Required: true},
			{Model: endpoint.APIParamModelText, Name: "value", Required: true},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_members_show",
		Component: model.NodeKindPD,
		Path:      "/members",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_leader_show",
		Component: model.NodeKindPD,
		Path:      "/leader",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_operator_show",
		Component: model.NodeKindPD,
		Path:      "/operators",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelText, Name: "kind"},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_regions",
		Component: model.NodeKindPD,
		Path:      "/regions",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_region_id",
		Component: model.NodeKindPD,
		Path:      "/region/id/{regionID}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelText, Name: "regionID", Required: true},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_region_key",
		Component: model.NodeKindPD,
		Path:      "/region/key/{regionKey}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelText, Name: "regionKey", Required: true},
		},
	}, endpoint.MiddlewareHandlerFunc(func(req *endpoint.Request) error {
		req.PathValues.Set("regionKey", url.QueryEscape(req.PathValues.Get("regionKey")))
		return nil
	}))
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_region_scan",
		Component: model.NodeKindPD,
		Path:      "/regions/key",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelText, Name: "key", Required: true},
			{Model: endpoint.APIParamModelInt, Name: "limit", Required: true},
		},
	}, endpoint.MiddlewareHandlerFunc(func(req *endpoint.Request) error {
		req.PathValues.Set("key", url.QueryEscape(req.PathValues.Get("key")))
		return nil
	}))
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_region_sibling",
		Component: model.NodeKindPD,
		Path:      "/regions/sibling/{regionID}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelText, Name: "regionID", Required: true},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_region_start_key",
		Component: model.NodeKindPD,
		Path:      "/regions/key",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelText, Name: "key", Required: true},
			{Model: endpoint.APIParamModelInt, Name: "limit"},
		},
	}, endpoint.MiddlewareHandlerFunc(func(req *endpoint.Request) error {
		req.PathValues.Set("key", url.QueryEscape(req.PathValues.Get("key")))
		return nil
	}))
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_regions_store",
		Component: model.NodeKindPD,
		Path:      "/regions/store/{storeID}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelText, Name: "storeID", Required: true},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_region_top_read",
		Component: model.NodeKindPD,
		Path:      "/regions/readflow",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelInt, Name: "limit"},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_region_top_write",
		Component: model.NodeKindPD,
		Path:      "/regions/writeflow",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelInt, Name: "limit"},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_region_top_conf_ver",
		Component: model.NodeKindPD,
		Path:      "/regions/confver",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelInt, Name: "limit"},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_region_top_version",
		Component: model.NodeKindPD,
		Path:      "/regions/version",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelInt, Name: "limit"},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_region_top_size",
		Component: model.NodeKindPD,
		Path:      "/regions/size",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelInt, Name: "limit"},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_region_check",
		Component: model.NodeKindPD,
		Path:      "/regions/check/{state}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{
				Model: endpoint.APIParamModelEnum([]endpoint.EnumItem{
					{Name: "miss-peer"},
					{Name: "extra-peer"},
					{Name: "down-peer"},
					{Name: "pending-peer"},
					{Name: "offline-peer"},
					{Name: "empty-peer"},
					{Name: "hist-peer"},
					{Name: "hist-keys"},
				}),
				Name: "state", Required: true},
		},
		QueryParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelInt, Name: "bound"},
		},
	}, endpoint.MiddlewareHandlerFunc(func(req *endpoint.Request) error {
		state := req.PathValues.Get("state")
		val := req.QueryValues.Get("bound")

		if val == "" {
			if strings.EqualFold(state, "hist-size") {
				req.QueryValues.Set("bound", "10")
			} else if strings.EqualFold(state, "hist-keys") {
				req.QueryValues.Set("bound", "10000")
			}
		}
		return nil
	}))
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_scheduler_show",
		Component: model.NodeKindPD,
		Path:      "/schedulers",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelText, Name: "status"},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_stores",
		Component: model.NodeKindPD,
		Path:      "/stores",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelTags, Name: "state"},
		},
	}, endpoint.MiddlewareHandlerFunc(func(req *endpoint.Request) error {
		vals := req.QueryValues["state"]
		req.QueryValues.Del("state")
		if len(vals) != 0 {
			for _, state := range vals {
				stateValue, ok := metapb.StoreState_value[state]
				if !ok {
					return fmt.Errorf("unknown state: %s", state)
				}
				req.QueryValues.Add("state", strconv.Itoa(int(stateValue)))
			}
		}
		return nil
	}))
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_store_id",
		Component: model.NodeKindPD,
		Path:      "/store/{storeID}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelText, Name: "storeID", Required: true},
		},
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "pd_pprof",
		Component: model.NodeKindPD,
		Path:      "/debug/pprof/{kind}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			pprofKindsParam,
		},
		QueryParams: []*endpoint.APIParam{
			{Model: endpoint.APIParamModelConstant("1"), Name: "debug"},
			pprofSecondsParam,
		},
	}, endpoint.MiddlewareHandlerFunc(func(req *endpoint.Request) error {
		return timeoutMiddleware(req, req.QueryValues.Get("seconds"))
	}))

	// tikv
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tikv_config",
		Component: model.NodeKindTiKV,
		Path:      "/config",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tikv_profile",
		Component: model.NodeKindTiKV,
		Path:      "/debug/pprof/profile",
		Method:    endpoint.MethodGet,
		Ext:       ".svg",
		QueryParams: []*endpoint.APIParam{
			pprofSecondsParam,
		},
	}, endpoint.MiddlewareHandlerFunc(func(req *endpoint.Request) error {
		return timeoutMiddleware(req, req.QueryValues.Get("seconds"))
	}))

	// tiflash
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tiflash_config",
		Component: model.NodeKindTiFlash,
		Path:      "/config",
		Method:    endpoint.MethodGet,
	})
	c.AddEndpoint(&endpoint.APIModel{
		ID:        "tiflash_profile",
		Component: model.NodeKindTiFlash,
		Path:      "/debug/pprof/profile",
		Method:    endpoint.MethodGet,
		Ext:       ".svg",
		QueryParams: []*endpoint.APIParam{
			pprofSecondsParam,
		},
	}, endpoint.MiddlewareHandlerFunc(func(req *endpoint.Request) error {
		return timeoutMiddleware(req, req.QueryValues.Get("seconds"))
	}))
}
