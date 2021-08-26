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

package endpoint

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/pingcap/kvproto/pkg/metapb"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

var pprofKindsParam = NewAPIParam(APIParamModelEnum([]EnumItem{
	{Name: "allocs"},
	{Name: "block"},
	{Name: "cmdline"},
	{Name: "goroutine"},
	{Name: "heap"},
	{Name: "mutex"},
	{Name: "profile"},
	{Name: "threadcreate"},
	{Name: "trace"},
}), "kind", true)

var pprofSecondsParam = NewAPIParam(APIParamModelEnum([]EnumItem{
	{Name: "10s", Value: "10"},
	{Name: "30s", Value: "30"},
	{Name: "60s", Value: "60"},
	{Name: "120s", Value: "120"},
}), "seconds", false)

func timeoutHook(req *Request, sec string) error {
	i, err := strconv.ParseInt(sec, 10, 64)
	if err != nil {
		return err
	}
	duration := time.Duration(i) * time.Second
	req.Timeout = duration + duration/2
	return nil
}

// tidb endpoints

var tidbStatsDump = APIModel{
	ID:        "tidb_stats_dump",
	Component: model.NodeKindTiDB,
	Path:      "/stats/dump/{db}/{table}",
	Method:    MethodGet,
	PathParams: []*APIParam{
		NewAPIParam(APIParamModelDB, "db", true),
		NewAPIParam(APIParamModelTable, "table", true),
	},
}

var tidbStatsDumpWithTimestamp = APIModel{
	ID:        "tidb_stats_dump_timestamp",
	Component: model.NodeKindTiDB,
	Path:      "/stats/dump/{db}/{table}/{yyyyMMddHHmmss}",
	Method:    MethodGet,
	PathParams: []*APIParam{
		NewAPIParam(APIParamModelDB, "db", true),
		NewAPIParam(APIParamModelTable, "table", true),
		NewAPIParam(APIParamModelText, "yyyyMMddHHmmss", true),
	},
}

var tidbConfig = APIModel{
	ID:        "tidb_config",
	Component: model.NodeKindTiDB,
	Path:      "/settings",
	Method:    MethodGet,
}

var tidbSchema = APIModel{
	ID:        "tidb_schema",
	Component: model.NodeKindTiDB,
	Path:      "/schema",
	Method:    MethodGet,
	QueryParams: []*APIParam{
		NewAPIParam(APIParamModelTableID, "table_id", false),
	},
}

var tidbSchemaWithDB = APIModel{
	ID:        "tidb_schema_db",
	Component: model.NodeKindTiDB,
	Path:      "/schema/{db}",
	Method:    MethodGet,
	PathParams: []*APIParam{
		NewAPIParam(APIParamModelDB, "db", true),
	},
}

var tidbSchemaWithDBTable = APIModel{
	ID:        "tidb_schema_db_table",
	Component: model.NodeKindTiDB,
	Path:      "/schema/{db}/{table}",
	Method:    MethodGet,
	PathParams: []*APIParam{
		NewAPIParam(APIParamModelDB, "db", true),
		NewAPIParam(APIParamModelTable, "table", true),
	},
}

var tidbDBTableWithTableID = APIModel{
	ID:        "tidb_dbtable_tableid",
	Component: model.NodeKindTiDB,
	Path:      "/db-table/{tableID}",
	Method:    MethodGet,
	PathParams: []*APIParam{
		NewAPIParam(APIParamModelTableID, "tableID", true),
	},
}

var tidbDDLHistory = APIModel{
	ID:        "tidb_ddl_history",
	Component: model.NodeKindTiDB,
	Path:      "/ddl/history",
	Method:    MethodGet,
}

var tidbInfo = APIModel{
	ID:        "tidb_info",
	Component: model.NodeKindTiDB,
	Path:      "/info",
	Method:    MethodGet,
}

var tidbInfoAll = APIModel{
	ID:        "tidb_info_all",
	Component: model.NodeKindTiDB,
	Path:      "/info/all",
	Method:    MethodGet,
}

var tidbRegionsMeta = APIModel{
	ID:        "tidb_regions_meta",
	Component: model.NodeKindTiDB,
	Path:      "/regions/meta",
	Method:    MethodGet,
}

var tidbRegionID = APIModel{
	ID:        "tidb_region_id",
	Component: model.NodeKindTiDB,
	Path:      "/regions/{regionID}",
	Method:    MethodGet,
	PathParams: []*APIParam{
		NewAPIParam(APIParamModelText, "regionID", true),
	},
}

var tidbTableRegions = APIModel{
	ID:        "tidb_table_regions",
	Component: model.NodeKindTiDB,
	Path:      "/tables/{db}/{table}/regions",
	Method:    MethodGet,
	PathParams: []*APIParam{
		NewAPIParam(APIParamModelDB, "db", true),
		NewAPIParam(APIParamModelTable, "table", true),
	},
}

var tidbHotRegions = APIModel{
	ID:        "tidb_hot_regions",
	Component: model.NodeKindTiDB,
	Path:      "/regions/hot",
	Method:    MethodGet,
}

var tidbPprof = APIModel{
	ID:        "tidb_pprof",
	Component: model.NodeKindTiDB,
	Path:      "/debug/pprof/{kind}",
	Method:    MethodGet,
	PathParams: []*APIParam{
		pprofKindsParam,
	},
	QueryParams: []*APIParam{
		NewAPIParam(APIParamModelConstant("1"), "debug", false),
		pprofSecondsParam,
	},
	UpdateRequestHandler: func(req *Request, path, query Values, m *APIModel) error {
		return timeoutHook(req, query.Get("seconds"))
	},
}

// pd endpoints

var pdCluster = APIModel{
	ID:        "pd_cluster",
	Component: model.NodeKindPD,
	Path:      "/cluster",
	Method:    MethodGet,
}

var pdClusterStatus = APIModel{
	ID:        "pd_cluster_status",
	Component: model.NodeKindPD,
	Path:      "/cluster/status",
	Method:    MethodGet,
}

var pdConfigShowAll = APIModel{
	ID:        "pd_config_show_all",
	Component: model.NodeKindPD,
	Path:      "/config",
	Method:    MethodGet,
}

var pdHealth = APIModel{
	ID:        "pd_health",
	Component: model.NodeKindPD,
	Path:      "/health",
	Method:    MethodGet,
}

var pdHotRead = APIModel{
	ID:        "pd_hot_read",
	Component: model.NodeKindPD,
	Path:      "/hotspot/regions/read",
	Method:    MethodGet,
}

var pdHotWrite = APIModel{
	ID:        "pd_hot_write",
	Component: model.NodeKindPD,
	Path:      "/hotspot/regions/write",
	Method:    MethodGet,
}

var pdHotStores = APIModel{
	ID:        "pd_hot_stores",
	Component: model.NodeKindPD,
	Path:      "/hotspot/stores",
	Method:    MethodGet,
}

var pdLabels = APIModel{
	ID:        "pd_labels",
	Component: model.NodeKindPD,
	Path:      "/labels",
	Method:    MethodGet,
}

var pdLabelStores = APIModel{
	ID:        "pd_label_stores",
	Component: model.NodeKindPD,
	Path:      "/labels/stores",
	Method:    MethodGet,
	QueryParams: []*APIParam{
		NewAPIParam(APIParamModelText, "name", true),
		NewAPIParam(APIParamModelText, "value", true),
	},
}

var pdMembersShow = APIModel{
	ID:        "pd_members_show",
	Component: model.NodeKindPD,
	Path:      "/members",
	Method:    MethodGet,
}

var pdLeaderShow = APIModel{
	ID:        "pd_leader_show",
	Component: model.NodeKindPD,
	Path:      "/leader",
	Method:    MethodGet,
}

var pdOperatorShow = APIModel{
	ID:        "pd_operator_show",
	Component: model.NodeKindPD,
	Path:      "/operators",
	Method:    MethodGet,
	QueryParams: []*APIParam{
		NewAPIParam(APIParamModelText, "kind", false),
	},
}

var pdRegions = APIModel{
	ID:        "pd_regions",
	Component: model.NodeKindPD,
	Path:      "/regions",
	Method:    MethodGet,
}

var pdRegionID = APIModel{
	ID:        "pd_region_id",
	Component: model.NodeKindPD,
	Path:      "/region/id/{regionID}",
	Method:    MethodGet,
	PathParams: []*APIParam{
		NewAPIParam(APIParamModelText, "regionID", true),
	},
}

var pdRegionKey = APIModel{
	ID:        "pd_region_key",
	Component: model.NodeKindPD,
	Path:      "/region/key/{regionKey}",
	Method:    MethodGet,
	PathParams: []*APIParam{
		NewAPIParam(APIParamModelText, "regionKey", true).AddTransformer(func(ctx *Context) error {
			val := ctx.Value()
			ctx.SetValue(url.QueryEscape(val))
			return nil
		}),
	},
}

var pdRegionScan = APIModel{
	ID:        "pd_region_scan",
	Component: model.NodeKindPD,
	Path:      "/regions/key",
	Method:    MethodGet,
	QueryParams: []*APIParam{
		NewAPIParam(APIParamModelText, "key", true).AddTransformer(func(ctx *Context) error {
			val := ctx.Value()
			ctx.SetValue(url.QueryEscape(val))
			return nil
		}),
		NewAPIParam(APIParamModelInt, "limit", true),
	},
}

var pdRegionSibling = APIModel{
	ID:        "pd_region_sibling",
	Component: model.NodeKindPD,
	Path:      "/regions/sibling/{regionID}",
	Method:    MethodGet,
	PathParams: []*APIParam{
		NewAPIParam(APIParamModelText, "regionID", true),
	},
}

var pdRegionStartKey = APIModel{
	ID:        "pd_region_start_key",
	Component: model.NodeKindPD,
	Path:      "/regions/key",
	Method:    MethodGet,
	QueryParams: []*APIParam{
		NewAPIParam(APIParamModelText, "key", true).AddTransformer(func(ctx *Context) error {
			val := ctx.Value()
			ctx.SetValue(url.QueryEscape(val))
			return nil
		}),
		NewAPIParam(APIParamModelInt, "limit", false),
	},
}

var pdRegionsStore = APIModel{
	ID:        "pd_regions_store",
	Component: model.NodeKindPD,
	Path:      "/regions/store/{storeID}",
	Method:    MethodGet,
	PathParams: []*APIParam{
		NewAPIParam(APIParamModelText, "storeID", true),
	},
}

var pdRegionTopRead = APIModel{
	ID:        "pd_region_top_read",
	Component: model.NodeKindPD,
	Path:      "/regions/readflow",
	Method:    MethodGet,
	QueryParams: []*APIParam{
		NewAPIParam(APIParamModelInt, "limit", false),
	},
}

var pdRegionTopWrite = APIModel{
	ID:        "pd_region_top_write",
	Component: model.NodeKindPD,
	Path:      "/regions/writeflow",
	Method:    MethodGet,
	QueryParams: []*APIParam{
		NewAPIParam(APIParamModelInt, "limit", false),
	},
}

var pdRegionTopConfVer = APIModel{
	ID:        "pd_region_top_conf_ver",
	Component: model.NodeKindPD,
	Path:      "/regions/confver",
	Method:    MethodGet,
	QueryParams: []*APIParam{
		NewAPIParam(APIParamModelInt, "limit", false),
	},
}

var pdRegionTopVersion = APIModel{
	ID:        "pd_region_top_version",
	Component: model.NodeKindPD,
	Path:      "/regions/version",
	Method:    MethodGet,
	QueryParams: []*APIParam{
		NewAPIParam(APIParamModelInt, "limit", false),
	},
}

var pdRegionTopSize = APIModel{
	ID:        "pd_region_top_size",
	Component: model.NodeKindPD,
	Path:      "/regions/size",
	Method:    MethodGet,
	QueryParams: []*APIParam{
		NewAPIParam(APIParamModelInt, "limit", false),
	},
}

var pdRegionCheck = APIModel{
	ID:        "pd_region_check",
	Component: model.NodeKindPD,
	Path:      "/regions/check/{state}",
	Method:    MethodGet,
	PathParams: []*APIParam{
		NewAPIParam(APIParamModelEnum([]EnumItem{
			{Name: "miss-peer"},
			{Name: "extra-peer"},
			{Name: "down-peer"},
			{Name: "pending-peer"},
			{Name: "offline-peer"},
			{Name: "empty-peer"},
			{Name: "hist-peer"},
			{Name: "hist-keys"},
		}), "state", true),
	},
	QueryParams: []*APIParam{
		NewAPIParam(APIParamModelInt, "bound", false).AddTransformer(func(ctx *Context) error {
			state := ctx.ParamValue("state")
			val := ctx.Value()

			if val == "" {
				if strings.EqualFold(state, "hist-size") {
					ctx.SetValue("10")
				} else if strings.EqualFold(state, "hist-keys") {
					ctx.SetValue("10000")
				}
			}
			return nil
		}),
	},
}

var pdSchedulerShow = APIModel{
	ID:        "pd_scheduler_show",
	Component: model.NodeKindPD,
	Path:      "/schedulers",
	Method:    MethodGet,
	QueryParams: []*APIParam{
		NewAPIParam(APIParamModelText, "status", false),
	},
}

var pdStores = APIModel{
	ID:        "pd_stores",
	Component: model.NodeKindPD,
	Path:      "/stores",
	Method:    MethodGet,
	QueryParams: []*APIParam{
		NewAPIParam(APIParamModelTags, "state", false).AddTransformer(func(ctx *Context) error {
			vals := ctx.Values()
			if len(vals) != 0 {
				var stateValues []string
				for _, state := range vals {
					stateValue, ok := metapb.StoreState_value[state]
					if !ok {
						return fmt.Errorf("unknown state: %s", state)
					}
					stateValues = append(stateValues, strconv.Itoa(int(stateValue)))
				}
				ctx.SetValues(stateValues)
			}
			return nil
		}),
	},
}

var pdStoreID = APIModel{
	ID:        "pd_store_id",
	Component: model.NodeKindPD,
	Path:      "/store/{storeID}",
	Method:    MethodGet,
	PathParams: []*APIParam{
		NewAPIParam(APIParamModelText, "storeID", true),
	},
}

var pdPprof = APIModel{
	ID:        "pd_pprof",
	Component: model.NodeKindPD,
	Path:      "/debug/pprof/{kind}",
	Method:    MethodGet,
	PathParams: []*APIParam{
		pprofKindsParam,
	},
	QueryParams: []*APIParam{
		NewAPIParam(APIParamModelConstant("1"), "debug", false),
		pprofSecondsParam,
	},
	UpdateRequestHandler: func(req *Request, path, query Values, m *APIModel) error {
		return timeoutHook(req, query.Get("seconds"))
	},
}

// tikv
var tikvConfig = APIModel{
	ID:        "tikv_config",
	Component: model.NodeKindTiKV,
	Path:      "/config",
	Method:    MethodGet,
}

var tikvPprof = APIModel{
	ID:        "tikv_profile",
	Component: model.NodeKindTiKV,
	Path:      "/debug/pprof/profile",
	Method:    MethodGet,
	Ext:       ".svg",
	QueryParams: []*APIParam{
		pprofSecondsParam,
	},
	UpdateRequestHandler: func(req *Request, path, query Values, m *APIModel) error {
		return timeoutHook(req, query.Get("seconds"))
	},
}

// tiflash
var tiflashConfig = APIModel{
	ID:        "tiflash_config",
	Component: model.NodeKindTiFlash,
	Path:      "/config",
	Method:    MethodGet,
}

var tiflashPprof = APIModel{
	ID:        "tiflash_profile",
	Component: model.NodeKindTiFlash,
	Path:      "/debug/pprof/profile",
	Method:    MethodGet,
	Ext:       ".svg",
	QueryParams: []*APIParam{
		pprofSecondsParam,
	},
	UpdateRequestHandler: func(req *Request, path, query Values, m *APIModel) error {
		return timeoutHook(req, query.Get("seconds"))
	},
}

var APIListDef = []APIModel{
	// tidb
	tidbStatsDump,
	tidbStatsDumpWithTimestamp,
	tidbConfig,
	tidbSchema,
	tidbSchemaWithDB,
	tidbSchemaWithDBTable,
	tidbDBTableWithTableID,
	tidbDDLHistory,
	tidbInfo,
	tidbInfoAll,
	tidbRegionsMeta,
	tidbRegionID,
	tidbTableRegions,
	tidbHotRegions,
	tidbPprof,
	// pd
	pdCluster,
	pdClusterStatus,
	pdConfigShowAll,
	pdHealth,
	pdHotRead,
	pdHotWrite,
	pdHotStores,
	pdLabels,
	pdLabelStores,
	pdMembersShow,
	pdLeaderShow,
	pdOperatorShow,
	pdRegions,
	pdRegionID,
	pdRegionKey,
	pdRegionScan,
	pdRegionSibling,
	pdRegionStartKey,
	pdRegionsStore,
	pdRegionTopRead,
	pdRegionTopWrite,
	pdRegionTopConfVer,
	pdRegionTopVersion,
	pdRegionTopSize,
	pdRegionCheck,
	pdSchedulerShow,
	pdStores,
	pdStoreID,
	pdPprof,
	// tikv
	tikvConfig,
	tikvPprof,
	// tiflash
	tiflashConfig,
	tiflashPprof,
}
