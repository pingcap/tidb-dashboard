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
	"net/url"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

// tidb endpoints

var tidbStatsDump EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_stats_dump",
	Component: model.NodeKindTiDB,
	Path:      "/stats/dump/{db}/{table}",
	Method:    EndpointMethodGet,
	PathParams: []EndpointAPIParam{
		{
			Name:  "db",
			Model: EndpointAPIParamModelDB,
		},
		{
			Name:  "table",
			Model: EndpointAPIParamModelTable,
		},
	},
}

var tidbStatsDumpWithTimestamp EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_stats_dump_timestamp",
	Component: model.NodeKindTiDB,
	Path:      "/stats/dump/{db}/{table}/{yyyyMMddHHmmss}",
	Method:    EndpointMethodGet,
	PathParams: []EndpointAPIParam{
		{
			Name:  "db",
			Model: EndpointAPIParamModelDB,
		},
		{
			Name:  "table",
			Model: EndpointAPIParamModelTable,
		},
		{
			Name:  "yyyyMMddHHmmss",
			Model: EndpointAPIParamModelText,
		},
	},
}

var tidbConfig EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_config",
	Component: model.NodeKindTiDB,
	Path:      "/settings",
	Method:    EndpointMethodGet,
}

var tidbSchema EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_schema",
	Component: model.NodeKindTiDB,
	Path:      "/schema",
	Method:    EndpointMethodGet,
	QueryParams: []EndpointAPIParam{
		{
			Name:  "table_id",
			Model: EndpointAPIParamModelTableID,
		},
	},
}

var tidbSchemaWithDB EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_schema_db",
	Component: model.NodeKindTiDB,
	Path:      "/schema/{db}",
	Method:    EndpointMethodGet,
	PathParams: []EndpointAPIParam{
		{
			Name:  "db",
			Model: EndpointAPIParamModelDB,
		},
	},
}

var tidbSchemaWithDBTable EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_schema_db_table",
	Component: model.NodeKindTiDB,
	Path:      "/schema/{db}/{table}",
	Method:    EndpointMethodGet,
	PathParams: []EndpointAPIParam{
		{
			Name:  "db",
			Model: EndpointAPIParamModelDB,
		},
		{
			Name:  "table",
			Model: EndpointAPIParamModelTable,
		},
	},
}

var tidbDBTableWithTableID EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_dbtable_tableid",
	Component: model.NodeKindTiDB,
	Path:      "/db-table/{tableID}",
	Method:    EndpointMethodGet,
	PathParams: []EndpointAPIParam{
		{
			Name:  "tableID",
			Model: EndpointAPIParamModelTableID,
		},
	},
}

var tidbDDLHistory EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_ddl_history",
	Component: model.NodeKindTiDB,
	Path:      "/ddl/history",
	Method:    EndpointMethodGet,
}

var tidbInfo EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_info",
	Component: model.NodeKindTiDB,
	Path:      "/info",
	Method:    EndpointMethodGet,
}

var tidbInfoAll EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_info_all",
	Component: model.NodeKindTiDB,
	Path:      "/info/all",
	Method:    EndpointMethodGet,
}

var tidbRegionsMeta EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_regions_meta",
	Component: model.NodeKindTiDB,
	Path:      "/regions/meta",
	Method:    EndpointMethodGet,
}

var tidbHotRegions EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_hot_regions",
	Component: model.NodeKindTiDB,
	Path:      "/regions/hot",
	Method:    EndpointMethodGet,
}

var tidbRegionID EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_region_id",
	Component: model.NodeKindTiDB,
	Path:      "/regions/{regionID}",
	Method:    EndpointMethodGet,
	PathParams: []EndpointAPIParam{
		{
			Name:  "regionID",
			Model: EndpointAPIParamModelText,
		},
	},
}

var tidbTableRegions EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_table_regions",
	Component: model.NodeKindTiDB,
	Path:      "/tables/{db}/{table}/regions",
	Method:    EndpointMethodGet,
	PathParams: []EndpointAPIParam{
		{
			Name:  "db",
			Model: EndpointAPIParamModelDB,
		},
		{
			Name:  "table",
			Model: EndpointAPIParamModelTable,
		},
	},
}

var tidbPprofAlloc EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_pprof_alloc",
	Component: model.NodeKindTiDB,
	Path:      "/debug/pprof/allocs",
	Method:    EndpointMethodGet,
}

var tidbPprofBlock EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_pprof_block",
	Component: model.NodeKindTiDB,
	Path:      "/debug/pprof/block",
	Method:    EndpointMethodGet,
}

var tidbPprofGoroutine EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_pprof_goroutine",
	Component: model.NodeKindTiDB,
	Path:      "/debug/pprof/goroutine",
	Method:    EndpointMethodGet,
}

var tidbPprofHeap EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_pprof_heap",
	Component: model.NodeKindTiDB,
	Path:      "/debug/pprof/heap",
	Method:    EndpointMethodGet,
}

var tidbPprofMutex EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_pprof_mutex",
	Component: model.NodeKindTiDB,
	Path:      "/debug/pprof/mutex",
	Method:    EndpointMethodGet,
}

// pd endpoints

var pdCluster EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_cluster",
	Component: model.NodeKindPD,
	Path:      "/cluster",
	Method:    EndpointMethodGet,
}

var pdClusterStatus EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_cluster_status",
	Component: model.NodeKindPD,
	Path:      "/cluster/status",
	Method:    EndpointMethodGet,
}

var pdHealth EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_health",
	Component: model.NodeKindPD,
	Path:      "/health",
	Method:    EndpointMethodGet,
}

var pdHotRead EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_hot_read",
	Component: model.NodeKindPD,
	Path:      "/hotspot/regions/read",
	Method:    EndpointMethodGet,
}

var pdHotWrite EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_hot_write",
	Component: model.NodeKindPD,
	Path:      "/hotspot/regions/write",
	Method:    EndpointMethodGet,
}

var pdHotStores EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_hot_stores",
	Component: model.NodeKindPD,
	Path:      "/hotspot/stores",
	Method:    EndpointMethodGet,
}

var pdLabels EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_labels",
	Component: model.NodeKindPD,
	Path:      "/labels",
	Method:    EndpointMethodGet,
}

var pdLabelStores EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_label_stores",
	Component: model.NodeKindPD,
	Path:      "/labels/stores",
	Method:    EndpointMethodGet,
	QueryParams: []EndpointAPIParam{
		{
			Name:     "name",
			Model:    EndpointAPIParamModelText,
			Required: true,
		},
		{
			Name:     "value",
			Model:    EndpointAPIParamModelText,
			Required: true,
		},
	},
}

var pdMembersShow EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_members_show",
	Component: model.NodeKindPD,
	Path:      "/members",
	Method:    EndpointMethodGet,
}

var pdLeaderShow EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_leader_show",
	Component: model.NodeKindPD,
	Path:      "/leader",
	Method:    EndpointMethodGet,
}

var pdOperatorShow EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_operator_show",
	Component: model.NodeKindPD,
	Path:      "/operators",
	Method:    EndpointMethodGet,
	QueryParams: []EndpointAPIParam{
		{
			Name:  "kind",
			Model: EndpointAPIParamModelText,
		},
	},
}

var pdRegions EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_regions",
	Component: model.NodeKindPD,
	Path:      "/regions",
	Method:    EndpointMethodGet,
}

var pdRegionID EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_region_id",
	Component: model.NodeKindPD,
	Path:      "/region/id/{regionID}",
	Method:    EndpointMethodGet,
	PathParams: []EndpointAPIParam{
		{
			Name:  "regionID",
			Model: EndpointAPIParamModelText,
		},
	},
}

var pdRegionKey EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_region_key",
	Component: model.NodeKindPD,
	Path:      "/region/key/{regionKey}",
	Method:    EndpointMethodGet,
	PathParams: []EndpointAPIParam{
		{
			Name:  "regionKey",
			Model: EndpointAPIParamModelText,
			PreModelTransformer: func(value string) (string, error) {
				return url.QueryEscape(value), nil
			},
		},
	},
}

var pdRegionScan EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_region_scan",
	Component: model.NodeKindPD,
	Path:      "/regions/key",
	Method:    EndpointMethodGet,
	QueryParams: []EndpointAPIParam{
		{
			Name:     "key",
			Model:    EndpointAPIParamModelText,
			Required: true,
			PreModelTransformer: func(value string) (string, error) {
				return url.QueryEscape(value), nil
			},
		},
		{
			Name:     "limit",
			Model:    EndpointAPIParamModelInt,
			Required: true,
		},
	},
}

var pdRegionSibling EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_region_sibling",
	Component: model.NodeKindPD,
	Path:      "/regions/sibling/${regionID}",
	Method:    EndpointMethodGet,
	PathParams: []EndpointAPIParam{
		{
			Name:  "regionID",
			Model: EndpointAPIParamModelText,
		},
	},
}

var pdRegionStartKey EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_region_start_key",
	Component: model.NodeKindPD,
	Path:      "/regions/key",
	Method:    EndpointMethodGet,
	QueryParams: []EndpointAPIParam{
		{
			Name:     "key",
			Model:    EndpointAPIParamModelText,
			Required: true,
			PreModelTransformer: func(value string) (string, error) {
				return url.QueryEscape(value), nil
			},
		},
		{
			Name:  "limit",
			Model: EndpointAPIParamModelInt,
		},
	},
}

var pdRegionsStore EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_regions_store",
	Component: model.NodeKindPD,
	Path:      "/regions/store/${storeID}",
	Method:    EndpointMethodGet,
	PathParams: []EndpointAPIParam{
		{
			Name:  "storeID",
			Model: EndpointAPIParamModelText,
		},
	},
}

var pdRegionTopRead EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_region_top_read",
	Component: model.NodeKindPD,
	Path:      "/regions/readflow",
	Method:    EndpointMethodGet,
	QueryParams: []EndpointAPIParam{
		{
			Name:  "limit",
			Model: EndpointAPIParamModelInt,
		},
	},
}

var pdRegionTopWrite EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_region_top_write",
	Component: model.NodeKindPD,
	Path:      "/regions/writeflow",
	Method:    EndpointMethodGet,
	QueryParams: []EndpointAPIParam{
		{
			Name:  "limit",
			Model: EndpointAPIParamModelInt,
		},
	},
}

var pdRegionTopConfVer EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_region_top_conf_ver",
	Component: model.NodeKindPD,
	Path:      "/regions/confver",
	Method:    EndpointMethodGet,
	QueryParams: []EndpointAPIParam{
		{
			Name:  "limit",
			Model: EndpointAPIParamModelInt,
		},
	},
}

var pdRegionTopVersion EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_region_top_version",
	Component: model.NodeKindPD,
	Path:      "/regions/version",
	Method:    EndpointMethodGet,
	QueryParams: []EndpointAPIParam{
		{
			Name:  "limit",
			Model: EndpointAPIParamModelInt,
		},
	},
}

var pdRegionTopSize EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_region_top_size",
	Component: model.NodeKindPD,
	Path:      "/regions/size",
	Method:    EndpointMethodGet,
	QueryParams: []EndpointAPIParam{
		{
			Name:  "limit",
			Model: EndpointAPIParamModelInt,
		},
	},
}

// var pdRegionCheck EndpointAPIModel = EndpointAPIModel{
// 	ID:        "pd_region_check",
// 	Component: model.NodeKindPD,
// 	Path:      "/regions/check/{state}",
// 	Method:    EndpointMethodGet,
// 	PathParams: []EndpointAPIParam{
// 		{
// 			Name:  "state",
// 			Model: EndpointAPIParamModelText,
// 		},
// 	},
// 	QueryParams: []EndpointAPIParam{
// 		{
// 			Name:  "bound",
// 			Model: EndpointAPIParamModelInt,
// 			// TODO: diff check with diff state
// 			PreModelTransformer: func(value string) (string, error) {
// 				return value, nil
// 			},
// 		},
// 	},
// }

var pdSchedulerShow EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_scheduler_show",
	Component: model.NodeKindPD,
	Path:      "/schedulers",
	Method:    EndpointMethodGet,
	QueryParams: []EndpointAPIParam{
		{
			Name:  "status",
			Model: EndpointAPIParamModelText,
		},
	},
}

// var pdStores EndpointAPIModel = EndpointAPIModel{
// 	ID:        "pd_stores",
// 	Component: model.NodeKindPD,
// 	Path:      "/stores",
// 	Method:    EndpointMethodGet,
// 	QueryParams: []EndpointAPIParam{
// 		// TODO: multi values
// 		{
// 			Name:  "state",
// 			Model: EndpointAPIParamModelText,
// 		},
// 	},
// }

var pdStoreID EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_store_id",
	Component: model.NodeKindPD,
	Path:      "/store/{storeID}",
	Method:    EndpointMethodGet,
	PathParams: []EndpointAPIParam{
		{
			Name:  "storeID",
			Model: EndpointAPIParamModelText,
		},
	},
}

var pdPprofAlloc EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_pprof_alloc",
	Component: model.NodeKindPD,
	Path:      "/debug/pprof/allocs",
	Method:    EndpointMethodGet,
}

var pdPprofBlock EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_pprof_block",
	Component: model.NodeKindPD,
	Path:      "/debug/pprof/block",
	Method:    EndpointMethodGet,
}

var pdPprofGoroutine EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_pprof_goroutine",
	Component: model.NodeKindPD,
	Path:      "/debug/pprof/goroutine",
	Method:    EndpointMethodGet,
}

var pdPprofHeap EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_pprof_heap",
	Component: model.NodeKindPD,
	Path:      "/debug/pprof/heap",
	Method:    EndpointMethodGet,
}

var pdPprofMutex EndpointAPIModel = EndpointAPIModel{
	ID:        "pd_pprof_mutex",
	Component: model.NodeKindPD,
	Path:      "/debug/pprof/mutex",
	Method:    EndpointMethodGet,
}

var endpointAPIList []EndpointAPIModel = []EndpointAPIModel{
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
	// pdRegionCheck,
	pdSchedulerShow,
	// pdStores,
	pdStoreID,
	pdPprofAlloc,
	pdPprofBlock,
	pdPprofGoroutine,
	pdPprofHeap,
	pdPprofMutex,
}
