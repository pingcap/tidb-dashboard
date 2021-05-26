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

// tidb endpoints

var tidbStatsDump APIModel = APIModel{
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

var tidbStatsDumpWithTimestamp APIModel = APIModel{
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

var tidbConfig APIModel = APIModel{
	ID:        "tidb_config",
	Component: model.NodeKindTiDB,
	Path:      "/settings",
	Method:    MethodGet,
}

var tidbSchema APIModel = APIModel{
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

var tidbSchemaWithDB APIModel = APIModel{
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

var tidbSchemaWithDBTable APIModel = APIModel{
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

var tidbDBTableWithTableID APIModel = APIModel{
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

var tidbDDLHistory APIModel = APIModel{
	ID:        "tidb_ddl_history",
	Component: model.NodeKindTiDB,
	Path:      "/ddl/history",
	Method:    MethodGet,
}

var tidbInfo APIModel = APIModel{
	ID:        "tidb_info",
	Component: model.NodeKindTiDB,
	Path:      "/info",
	Method:    MethodGet,
}

var tidbInfoAll APIModel = APIModel{
	ID:        "tidb_info_all",
	Component: model.NodeKindTiDB,
	Path:      "/info/all",
	Method:    MethodGet,
}

var tidbRegionsMeta APIModel = APIModel{
	ID:        "tidb_regions_meta",
	Component: model.NodeKindTiDB,
	Path:      "/regions/meta",
	Method:    MethodGet,
}

var tidbHotRegions APIModel = APIModel{
	ID:        "tidb_hot_regions",
	Component: model.NodeKindTiDB,
	Path:      "/regions/hot",
	Method:    MethodGet,
}

var tidbRegionID APIModel = APIModel{
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

var tidbTableRegions APIModel = APIModel{
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

var tidbPprofAlloc APIModel = APIModel{
	ID:        "tidb_pprof_alloc",
	Component: model.NodeKindTiDB,
	Path:      "/debug/pprof/allocs",
	Method:    MethodGet,
}

var tidbPprofBlock APIModel = APIModel{
	ID:        "tidb_pprof_block",
	Component: model.NodeKindTiDB,
	Path:      "/debug/pprof/block",
	Method:    MethodGet,
}

var tidbPprofGoroutine APIModel = APIModel{
	ID:        "tidb_pprof_goroutine",
	Component: model.NodeKindTiDB,
	Path:      "/debug/pprof/goroutine",
	Method:    MethodGet,
}

var tidbPprofHeap APIModel = APIModel{
	ID:        "tidb_pprof_heap",
	Component: model.NodeKindTiDB,
	Path:      "/debug/pprof/heap",
	Method:    MethodGet,
}

var tidbPprofMutex APIModel = APIModel{
	ID:        "tidb_pprof_mutex",
	Component: model.NodeKindTiDB,
	Path:      "/debug/pprof/mutex",
	Method:    MethodGet,
}

// pd endpoints

var pdCluster APIModel = APIModel{
	ID:        "pd_cluster",
	Component: model.NodeKindPD,
	Path:      "/cluster",
	Method:    MethodGet,
}

var pdClusterStatus APIModel = APIModel{
	ID:        "pd_cluster_status",
	Component: model.NodeKindPD,
	Path:      "/cluster/status",
	Method:    MethodGet,
}

var pdHealth APIModel = APIModel{
	ID:        "pd_health",
	Component: model.NodeKindPD,
	Path:      "/health",
	Method:    MethodGet,
}

var pdHotRead APIModel = APIModel{
	ID:        "pd_hot_read",
	Component: model.NodeKindPD,
	Path:      "/hotspot/regions/read",
	Method:    MethodGet,
}

var pdHotWrite APIModel = APIModel{
	ID:        "pd_hot_write",
	Component: model.NodeKindPD,
	Path:      "/hotspot/regions/write",
	Method:    MethodGet,
}

var pdHotStores APIModel = APIModel{
	ID:        "pd_hot_stores",
	Component: model.NodeKindPD,
	Path:      "/hotspot/stores",
	Method:    MethodGet,
}

var pdLabels APIModel = APIModel{
	ID:        "pd_labels",
	Component: model.NodeKindPD,
	Path:      "/labels",
	Method:    MethodGet,
}

var pdLabelStores APIModel = APIModel{
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

var pdMembersShow APIModel = APIModel{
	ID:        "pd_members_show",
	Component: model.NodeKindPD,
	Path:      "/members",
	Method:    MethodGet,
}

var pdLeaderShow APIModel = APIModel{
	ID:        "pd_leader_show",
	Component: model.NodeKindPD,
	Path:      "/leader",
	Method:    MethodGet,
}

var pdOperatorShow APIModel = APIModel{
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

var pdRegions APIModel = APIModel{
	ID:        "pd_regions",
	Component: model.NodeKindPD,
	Path:      "/regions",
	Method:    MethodGet,
}

var pdRegionID APIModel = APIModel{
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

var pdRegionKey APIModel = APIModel{
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

var pdRegionScan APIModel = APIModel{
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

var pdRegionSibling APIModel = APIModel{
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

var pdRegionStartKey APIModel = APIModel{
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

var pdRegionsStore APIModel = APIModel{
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

var pdRegionTopRead APIModel = APIModel{
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

var pdRegionTopWrite APIModel = APIModel{
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

var pdRegionTopConfVer APIModel = APIModel{
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

var pdRegionTopVersion APIModel = APIModel{
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

var pdRegionTopSize APIModel = APIModel{
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

var pdRegionCheck APIModel = APIModel{
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

var pdSchedulerShow APIModel = APIModel{
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

var pdStores APIModel = APIModel{
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
					stateValues := []string{}
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

var pdStoreID APIModel = APIModel{
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

var pdPprofAlloc APIModel = APIModel{
	ID:        "pd_pprof_alloc",
	Component: model.NodeKindPD,
	Path:      "/debug/pprof/allocs",
	Method:    MethodGet,
}

var pdPprofBlock APIModel = APIModel{
	ID:        "pd_pprof_block",
	Component: model.NodeKindPD,
	Path:      "/debug/pprof/block",
	Method:    MethodGet,
}

var pdPprofGoroutine APIModel = APIModel{
	ID:        "pd_pprof_goroutine",
	Component: model.NodeKindPD,
	Path:      "/debug/pprof/goroutine",
	Method:    MethodGet,
}

var pdPprofHeap APIModel = APIModel{
	ID:        "pd_pprof_heap",
	Component: model.NodeKindPD,
	Path:      "/debug/pprof/heap",
	Method:    MethodGet,
}

var pdPprofMutex APIModel = APIModel{
	ID:        "pd_pprof_mutex",
	Component: model.NodeKindPD,
	Path:      "/debug/pprof/mutex",
	Method:    MethodGet,
}

var APIListDef []APIModel = []APIModel{
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
	tidbHotRegions,
	tidbRegionID,
	tidbTableRegions,
	tidbPprofAlloc,
	tidbPprofBlock,
	tidbPprofGoroutine,
	tidbPprofHeap,
	tidbPprofMutex,
	pdCluster,
	pdClusterStatus,
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
	pdPprofAlloc,
	pdPprofBlock,
	pdPprofGoroutine,
	pdPprofHeap,
	pdPprofMutex,
}
