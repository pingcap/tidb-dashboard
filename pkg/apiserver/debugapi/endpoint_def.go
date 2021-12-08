// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package debugapi

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/pingcap/kvproto/pkg/metapb"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/endpoint"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

var pprofKindsParam = &endpoint.APIParam{
	Name: "kind", Required: true,
	Model: APIParamModelEnum([]EnumItem{
		{Value: "allocs"},
		{Value: "block"},
		{Value: "cmdline"},
		{Value: "goroutine"},
		{Value: "heap"},
		{Value: "mutex"},
		{Value: "profile"},
		{Value: "threadcreate"},
		{Value: "trace"},
	}),
}

var pprofSecondsParam = &endpoint.APIParam{
	Name: "seconds",
	Model: APIParamModelEnum([]EnumItem{
		{Name: "10s", Value: "10"},
		{Name: "30s", Value: "30"},
		{Name: "60s", Value: "60"},
		{Name: "120s", Value: "120"},
	}),
}

var pprofDebugParam = &endpoint.APIParam{
	Name: "debug",
	Model: APIParamModelEnum([]EnumItem{
		{Name: "0", Value: "0"},
		{Name: "1", Value: "1"},
		{Name: "2", Value: "2"},
	}),
}

func resolveTimeoutFromQuery(key string) func(*endpoint.ResolvedRequestPayload) error {
	return func(payload *endpoint.ResolvedRequestPayload) error {
		timeout := payload.QueryParams.Get(key)
		if timeout == "" {
			return nil
		}
		i, err := strconv.ParseInt(timeout, 10, 64)
		if err != nil {
			return err
		}

		duration := time.Duration(i) * time.Second
		payload.Timeout = duration + duration/2
		return nil
	}
}

// tidb.
var endpointDefs = []*endpoint.APIModel{
	{
		ID:        "tidb_stats_dump",
		Component: model.NodeKindTiDB,
		Path:      "/stats/dump/{db}/{table}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: APIParamModelDB, Name: "db", Required: true},
			{Model: APIParamModelTable, Name: "table", Required: true},
		},
	},
	{
		ID:        "tidb_stats_dump_timestamp",
		Component: model.NodeKindTiDB,
		Path:      "/stats/dump/{db}/{table}/{yyyyMMddHHmmss}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: APIParamModelDB, Name: "db", Required: true},
			{Model: APIParamModelTable, Name: "table", Required: true},
			{Model: APIParamModelText, Name: "yyyyMMddHHmmss", Required: true},
		},
	},
	{
		ID:        "tidb_config",
		Component: model.NodeKindTiDB,
		Path:      "/settings",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "tidb_schema",
		Component: model.NodeKindTiDB,
		Path:      "/schema",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: APIParamModelTableID, Name: "table_id"},
		},
	},
	{
		ID:        "tidb_schema_db",
		Component: model.NodeKindTiDB,
		Path:      "/schema/{db}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: APIParamModelDB, Name: "db", Required: true},
		},
	},
	{
		ID:        "tidb_schema_db_table",
		Component: model.NodeKindTiDB,
		Path:      "/schema/{db}/{table}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: APIParamModelDB, Name: "db", Required: true},
			{Model: APIParamModelTable, Name: "table", Required: true},
		},
	},
	{
		ID:        "tidb_dbtable_tableid",
		Component: model.NodeKindTiDB,
		Path:      "/db-table/{tableID}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: APIParamModelTableID, Name: "tableID", Required: true},
		},
	},
	{
		ID:        "tidb_ddl_history",
		Component: model.NodeKindTiDB,
		Path:      "/ddl/history",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "tidb_info",
		Component: model.NodeKindTiDB,
		Path:      "/info",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "tidb_info_all",
		Component: model.NodeKindTiDB,
		Path:      "/info/all",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "tidb_regions_meta",
		Component: model.NodeKindTiDB,
		Path:      "/regions/meta",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "tidb_region_id",
		Component: model.NodeKindTiDB,
		Path:      "/regions/{regionID}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: APIParamModelText, Name: "regionID", Required: true},
		},
	},
	{
		ID:        "tidb_table_regions",
		Component: model.NodeKindTiDB,
		Path:      "/tables/{db}/{table}/regions",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: APIParamModelDB, Name: "db", Required: true},
			{Model: APIParamModelTable, Name: "table", Required: true},
		},
	},
	{
		ID:        "tidb_hot_regions",
		Component: model.NodeKindTiDB,
		Path:      "/regions/hot",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "tidb_pprof",
		Component: model.NodeKindTiDB,
		Path:      "/debug/pprof/{kind}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			pprofKindsParam,
		},
		QueryParams: []*endpoint.APIParam{
			pprofSecondsParam,
			pprofDebugParam,
		},
		OnResolve: resolveTimeoutFromQuery("seconds"),
	},
	// pd endpoints
	{
		ID:        "pd_cluster",
		Component: model.NodeKindPD,
		Path:      "/cluster",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "pd_cluster_status",
		Component: model.NodeKindPD,
		Path:      "/cluster/status",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "pd_config_show_all",
		Component: model.NodeKindPD,
		Path:      "/config",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "pd_health",
		Component: model.NodeKindPD,
		Path:      "/health",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "pd_hot_read",
		Component: model.NodeKindPD,
		Path:      "/hotspot/regions/read",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "pd_hot_write",
		Component: model.NodeKindPD,
		Path:      "/hotspot/regions/write",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "pd_hot_stores",
		Component: model.NodeKindPD,
		Path:      "/hotspot/stores",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "pd_labels",
		Component: model.NodeKindPD,
		Path:      "/labels",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "pd_label_stores",
		Component: model.NodeKindPD,
		Path:      "/labels/stores",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: APIParamModelText, Name: "name", Required: true},
			{Model: APIParamModelText, Name: "value", Required: true},
		},
	},
	{
		ID:        "pd_members_show",
		Component: model.NodeKindPD,
		Path:      "/members",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "pd_leader_show",
		Component: model.NodeKindPD,
		Path:      "/leader",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "pd_operator_show",
		Component: model.NodeKindPD,
		Path:      "/operators",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: APIParamModelText, Name: "kind"},
		},
	},
	{
		ID:        "pd_regions",
		Component: model.NodeKindPD,
		Path:      "/regions",
		Method:    endpoint.MethodGet,
	},
	{
		ID:        "pd_region_id",
		Component: model.NodeKindPD,
		Path:      "/region/id/{regionID}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: APIParamModelText, Name: "regionID", Required: true},
		},
	},
	{
		ID:        "pd_region_key",
		Component: model.NodeKindPD,
		Path:      "/region/key/{regionKey}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: APIParamModelEscapeText, Name: "regionKey", Required: true},
		},
	},
	{
		ID:        "pd_region_scan",
		Component: model.NodeKindPD,
		Path:      "/regions/key",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: APIParamModelEscapeText, Name: "key", Required: true},
			{Model: APIParamModelInt, Name: "limit", Required: true},
		},
	},
	{
		ID:        "pd_region_sibling",
		Component: model.NodeKindPD,
		Path:      "/regions/sibling/{regionID}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: APIParamModelText, Name: "regionID", Required: true},
		},
	},
	{
		ID:        "pd_region_start_key",
		Component: model.NodeKindPD,
		Path:      "/regions/key",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: APIParamModelEscapeText, Name: "key", Required: true},
			{Model: APIParamModelInt, Name: "limit"},
		},
	},
	{
		ID:        "pd_regions_store",
		Component: model.NodeKindPD,
		Path:      "/regions/store/{storeID}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: APIParamModelText, Name: "storeID", Required: true},
		},
	},
	{
		ID:        "pd_region_top_read",
		Component: model.NodeKindPD,
		Path:      "/regions/readflow",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: APIParamModelInt, Name: "limit"},
		},
	},
	{
		ID:        "pd_region_top_write",
		Component: model.NodeKindPD,
		Path:      "/regions/writeflow",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: APIParamModelInt, Name: "limit"},
		},
	},
	{
		ID:        "pd_region_top_conf_ver",
		Component: model.NodeKindPD,
		Path:      "/regions/confver",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: APIParamModelInt, Name: "limit"},
		},
	},
	{
		ID:        "pd_region_top_version",
		Component: model.NodeKindPD,
		Path:      "/regions/version",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: APIParamModelInt, Name: "limit"},
		},
	},
	{
		ID:        "pd_region_top_size",
		Component: model.NodeKindPD,
		Path:      "/regions/size",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: APIParamModelInt, Name: "limit"},
		},
	},
	{
		ID:        "pd_region_check",
		Component: model.NodeKindPD,
		Path:      "/regions/check/{state}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{
				Model: APIParamModelEnum([]EnumItem{
					{Value: "miss-peer"},
					{Value: "extra-peer"},
					{Value: "down-peer"},
					{Value: "pending-peer"},
					{Value: "offline-peer"},
					{Value: "empty-peer"},
					{Value: "hist-peer"},
					{Value: "hist-keys"},
				}),
				Name: "state", Required: true,
			},
		},
		QueryParams: []*endpoint.APIParam{
			{Model: APIParamModelInt, Name: "bound"},
		},
		OnResolve: func(resolvedPayload *endpoint.ResolvedRequestPayload) error {
			state := resolvedPayload.PathParams["state"]
			val := resolvedPayload.QueryParams.Get("bound")

			if val == "" {
				if strings.EqualFold(state, "hist-size") {
					resolvedPayload.QueryParams.Set("bound", "10")
				} else if strings.EqualFold(state, "hist-keys") {
					resolvedPayload.QueryParams.Set("bound", "10000")
				}
			}
			return nil
		},
	},
	{
		ID:        "pd_scheduler_show",
		Component: model.NodeKindPD,
		Path:      "/schedulers",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: APIParamModelText, Name: "status"},
		},
	},
	{
		ID:        "pd_stores",
		Component: model.NodeKindPD,
		Path:      "/stores",
		Method:    endpoint.MethodGet,
		QueryParams: []*endpoint.APIParam{
			{Model: APIParamModelMultiValue, Name: "state"},
		},
		OnResolve: func(resolvedPayload *endpoint.ResolvedRequestPayload) error {
			vals := resolvedPayload.QueryParams["state"]
			resolvedPayload.QueryParams.Del("state")
			if len(vals) == 0 {
				return nil
			}
			for _, state := range vals {
				stateValue, ok := metapb.StoreState_value[state]
				if !ok {
					return fmt.Errorf("unknown state: %s", state)
				}
				resolvedPayload.QueryParams.Add("state", strconv.Itoa(int(stateValue)))
			}
			return nil
		},
	},
	{
		ID:        "pd_store_id",
		Component: model.NodeKindPD,
		Path:      "/store/{storeID}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			{Model: APIParamModelText, Name: "storeID", Required: true},
		},
	},
	{
		ID:        "pd_pprof",
		Component: model.NodeKindPD,
		Path:      "/debug/pprof/{kind}",
		Method:    endpoint.MethodGet,
		PathParams: []*endpoint.APIParam{
			pprofKindsParam,
		},
		QueryParams: []*endpoint.APIParam{
			pprofSecondsParam,
			pprofDebugParam,
		},
		OnResolve: resolveTimeoutFromQuery("seconds"),
	},
	// tikv
	{
		ID:        "tikv_config",
		Component: model.NodeKindTiKV,
		Path:      "/config",
		Method:    endpoint.MethodGet,
	},
	// TODO: open after http client refactor
	// Here we need http client support to add the header to fetch the pprof data:
	// resolvedPayload.Header.Add("Content-Type", "application/protobuf")
	// or we need to override response header to fetch the svg data:
	// xxx.Response.Header.Set("Content-Type", "image/svg+xml")

	// {
	// 	ID:        "tikv_profile",
	// 	Component: model.NodeKindTiKV,
	// 	Path:      "/debug/pprof/profile",
	// 	Method:    endpoint.MethodGet,
	// 	QueryParams: []*endpoint.APIParam{
	// 		pprofSecondsParam,
	//    pprofDebugParam,
	// 	},
	// 	OnResolve: func(resolvedPayload *endpoint.ResolvedRequestPayload) error {
	// 		resolvedPayload.Header.Add("Content-Type", "application/protobuf")
	// 		if err := timeoutMiddleware(resolvedPayload, resolvedPayload.QueryParams.Get("seconds")); err != nil {
	// 			return err
	// 		}
	// 		return nil
	// 	},
	// },
	// tiflash
	{
		ID:        "tiflash_config",
		Component: model.NodeKindTiFlash,
		Path:      "/config",
		Method:    endpoint.MethodGet,
	},
	// TODO: open after http client refactor
	// Here we need http client support to add the header to fetch the pprof data:
	// resolvedPayload.Header.Add("Content-Type", "application/protobuf")
	// or we need to override response header to fetch the svg data:
	// xxx.Response.Header.Set("Content-Type", "image/svg+xml")

	// {
	// 	ID:        "tiflash_profile",
	// 	Component: model.NodeKindTiFlash,
	// 	Path:      "/debug/pprof/profile",
	// 	Method:    endpoint.MethodGet,
	// 	QueryParams: []*endpoint.APIParam{
	// 		pprofSecondsParam,
	//    pprofDebugParam,
	// 	},
	// 	OnResolve: func(resolvedPayload *endpoint.ResolvedRequestPayload) error {
	// 		resolvedPayload.Header.Add("Content-Type", "application/protobuf")
	// 		if err := timeoutMiddleware(resolvedPayload, resolvedPayload.QueryParams.Get("seconds")); err != nil {
	// 			return err
	// 		}
	// 		return nil
	// 	},
	// },
}
