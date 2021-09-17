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

	"github.com/pingcap/kvproto/pkg/metapb"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

var pprofKindsParam = APIParam{
	Name: "kind",
	Model: CreateAPIParamModelEnum([]EnumItem{
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
}

// TODO: After http client refactor.
// Recorvery the second options as same as profiling module or just not limit it.
// Now limit the seconds according to `defaultTimeout` in debugapi/client.go
var pprofSecondsParam = APIParam{
	Name: "seconds",
	Model: CreateAPIParamModelEnum([]EnumItem{
		{Name: "10s", Value: "10"},
		{Name: "30s", Value: "30"},
		{Name: "45s", Value: "45"},
		// {Name: "60s", Value: "60"},
		// {Name: "120s", Value: "120"},
	}),
}

var pprofDebugParam = APIParam{
	Name: "debug",
	Model: CreateAPIParamModelEnum([]EnumItem{
		{Name: "0", Value: "0"},
		{Name: "1", Value: "1"},
		{Name: "2", Value: "2"},
	}),
}

// tidb endpoints

var tidbStatsDump = APIModel{
	ID:        "tidb_stats_dump",
	Component: model.NodeKindTiDB,
	Path:      "/stats/dump/{db}/{table}",
	Method:    MethodGet,
	PathParams: []APIParam{
		{
			Name:  "db",
			Model: APIParamModelDB,
		},
		{
			Name:  "table",
			Model: APIParamModelTable,
		},
	},
}

var tidbStatsDumpWithTimestamp = APIModel{
	ID:        "tidb_stats_dump_timestamp",
	Component: model.NodeKindTiDB,
	Path:      "/stats/dump/{db}/{table}/{yyyyMMddHHmmss}",
	Method:    MethodGet,
	PathParams: []APIParam{
		{
			Name:  "db",
			Model: APIParamModelDB,
		},
		{
			Name:  "table",
			Model: APIParamModelTable,
		},
		{
			Name:  "yyyyMMddHHmmss",
			Model: APIParamModelText,
		},
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
	QueryParams: []APIParam{
		{
			Name:  "table_id",
			Model: APIParamModelTableID,
		},
	},
}

var tidbSchemaWithDB = APIModel{
	ID:        "tidb_schema_db",
	Component: model.NodeKindTiDB,
	Path:      "/schema/{db}",
	Method:    MethodGet,
	PathParams: []APIParam{
		{
			Name:  "db",
			Model: APIParamModelDB,
		},
	},
}

var tidbSchemaWithDBTable = APIModel{
	ID:        "tidb_schema_db_table",
	Component: model.NodeKindTiDB,
	Path:      "/schema/{db}/{table}",
	Method:    MethodGet,
	PathParams: []APIParam{
		{
			Name:  "db",
			Model: APIParamModelDB,
		},
		{
			Name:  "table",
			Model: APIParamModelTable,
		},
	},
}

var tidbDBTableWithTableID = APIModel{
	ID:        "tidb_dbtable_tableid",
	Component: model.NodeKindTiDB,
	Path:      "/db-table/{tableID}",
	Method:    MethodGet,
	PathParams: []APIParam{
		{
			Name:  "tableID",
			Model: APIParamModelTableID,
		},
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
	PathParams: []APIParam{
		{
			Name:  "regionID",
			Model: APIParamModelText,
		},
	},
}

var tidbTableRegions = APIModel{
	ID:        "tidb_table_regions",
	Component: model.NodeKindTiDB,
	Path:      "/tables/{db}/{table}/regions",
	Method:    MethodGet,
	PathParams: []APIParam{
		{
			Name:  "db",
			Model: APIParamModelDB,
		},
		{
			Name:  "table",
			Model: APIParamModelTable,
		},
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
	PathParams: []APIParam{
		pprofKindsParam,
	},
	QueryParams: []APIParam{
		pprofSecondsParam,
		pprofDebugParam,
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
	QueryParams: []APIParam{
		{
			Name:     "name",
			Model:    APIParamModelText,
			Required: true,
		},
		{
			Name:     "value",
			Model:    APIParamModelText,
			Required: true,
		},
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
	QueryParams: []APIParam{
		{
			Name:  "kind",
			Model: APIParamModelText,
		},
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
	PathParams: []APIParam{
		{
			Name:  "regionID",
			Model: APIParamModelText,
		},
	},
}

var pdRegionKey = APIModel{
	ID:        "pd_region_key",
	Component: model.NodeKindPD,
	Path:      "/region/key/{regionKey}",
	Method:    MethodGet,
	PathParams: []APIParam{
		{
			Name:  "regionKey",
			Model: APIParamModelText,
			PreModelTransformer: func(ctx *Context) error {
				val := ctx.Value()
				ctx.SetValue(url.QueryEscape(val))
				return nil
			},
		},
	},
}

var pdRegionScan = APIModel{
	ID:        "pd_region_scan",
	Component: model.NodeKindPD,
	Path:      "/regions/key",
	Method:    MethodGet,
	QueryParams: []APIParam{
		{
			Name:     "key",
			Model:    APIParamModelText,
			Required: true,
			PreModelTransformer: func(ctx *Context) error {
				val := ctx.Value()
				ctx.SetValue(url.QueryEscape(val))
				return nil
			},
		},
		{
			Name:     "limit",
			Model:    APIParamModelInt,
			Required: true,
		},
	},
}

var pdRegionSibling = APIModel{
	ID:        "pd_region_sibling",
	Component: model.NodeKindPD,
	Path:      "/regions/sibling/{regionID}",
	Method:    MethodGet,
	PathParams: []APIParam{
		{
			Name:  "regionID",
			Model: APIParamModelText,
		},
	},
}

var pdRegionStartKey = APIModel{
	ID:        "pd_region_start_key",
	Component: model.NodeKindPD,
	Path:      "/regions/key",
	Method:    MethodGet,
	QueryParams: []APIParam{
		{
			Name:     "key",
			Model:    APIParamModelText,
			Required: true,
			PreModelTransformer: func(ctx *Context) error {
				val := ctx.Value()
				ctx.SetValue(url.QueryEscape(val))
				return nil
			},
		},
		{
			Name:  "limit",
			Model: APIParamModelInt,
		},
	},
}

var pdRegionsStore = APIModel{
	ID:        "pd_regions_store",
	Component: model.NodeKindPD,
	Path:      "/regions/store/{storeID}",
	Method:    MethodGet,
	PathParams: []APIParam{
		{
			Name:  "storeID",
			Model: APIParamModelText,
		},
	},
}

var pdRegionTopRead = APIModel{
	ID:        "pd_region_top_read",
	Component: model.NodeKindPD,
	Path:      "/regions/readflow",
	Method:    MethodGet,
	QueryParams: []APIParam{
		{
			Name:  "limit",
			Model: APIParamModelInt,
		},
	},
}

var pdRegionTopWrite = APIModel{
	ID:        "pd_region_top_write",
	Component: model.NodeKindPD,
	Path:      "/regions/writeflow",
	Method:    MethodGet,
	QueryParams: []APIParam{
		{
			Name:  "limit",
			Model: APIParamModelInt,
		},
	},
}

var pdRegionTopConfVer = APIModel{
	ID:        "pd_region_top_conf_ver",
	Component: model.NodeKindPD,
	Path:      "/regions/confver",
	Method:    MethodGet,
	QueryParams: []APIParam{
		{
			Name:  "limit",
			Model: APIParamModelInt,
		},
	},
}

var pdRegionTopVersion = APIModel{
	ID:        "pd_region_top_version",
	Component: model.NodeKindPD,
	Path:      "/regions/version",
	Method:    MethodGet,
	QueryParams: []APIParam{
		{
			Name:  "limit",
			Model: APIParamModelInt,
		},
	},
}

var pdRegionTopSize = APIModel{
	ID:        "pd_region_top_size",
	Component: model.NodeKindPD,
	Path:      "/regions/size",
	Method:    MethodGet,
	QueryParams: []APIParam{
		{
			Name:  "limit",
			Model: APIParamModelInt,
		},
	},
}

var pdRegionCheck = APIModel{
	ID:        "pd_region_check",
	Component: model.NodeKindPD,
	Path:      "/regions/check/{state}",
	Method:    MethodGet,
	PathParams: []APIParam{
		{
			Name: "state",
			Model: CreateAPIParamModelEnum([]EnumItem{
				{Name: "miss-peer"},
				{Name: "extra-peer"},
				{Name: "down-peer"},
				{Name: "pending-peer"},
				{Name: "offline-peer"},
				{Name: "empty-peer"},
				{Name: "hist-peer"},
				{Name: "hist-keys"},
			}),
		},
	},
	QueryParams: []APIParam{
		{
			Name:  "bound",
			Model: APIParamModelInt,
			PreModelTransformer: func(ctx *Context) error {
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
			},
		},
	},
}

var pdSchedulerShow = APIModel{
	ID:        "pd_scheduler_show",
	Component: model.NodeKindPD,
	Path:      "/schedulers",
	Method:    MethodGet,
	QueryParams: []APIParam{
		{
			Name:  "status",
			Model: APIParamModelText,
		},
	},
}

var pdStores = APIModel{
	ID:        "pd_stores",
	Component: model.NodeKindPD,
	Path:      "/stores",
	Method:    MethodGet,
	QueryParams: []APIParam{
		{
			Name:  "state",
			Model: APIParamModelMultiTags,
			PostModelTransformer: func(ctx *Context) error {
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
			},
		},
	},
}

var pdStoreID = APIModel{
	ID:        "pd_store_id",
	Component: model.NodeKindPD,
	Path:      "/store/{storeID}",
	Method:    MethodGet,
	PathParams: []APIParam{
		{
			Name:  "storeID",
			Model: APIParamModelText,
		},
	},
}

var pdPprof = APIModel{
	ID:        "pd_pprof",
	Component: model.NodeKindPD,
	Path:      "/debug/pprof/{kind}",
	Method:    MethodGet,
	PathParams: []APIParam{
		pprofKindsParam,
	},
	QueryParams: []APIParam{
		pprofSecondsParam,
		pprofDebugParam,
	},
}

// tikv
var tikvConfig = APIModel{
	ID:        "tikv_config",
	Component: model.NodeKindTiKV,
	Path:      "/config",
	Method:    MethodGet,
	QueryParams: []APIParam{
		{
			Name:  "full",
			Model: APIParamModelBool,
		},
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
}
