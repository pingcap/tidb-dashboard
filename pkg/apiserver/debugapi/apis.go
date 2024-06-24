// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package debugapi

import (
	"github.com/go-resty/resty/v2"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/endpoint"
	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

var commonParamPprofKinds = endpoint.APIParamEnum("kind", true, []endpoint.EnumItemDefinition{
	{Value: "allocs"},
	{Value: "block"},
	{Value: "cmdline"},
	{Value: "goroutine"},
	{Value: "heap"},
	{Value: "mutex"},
	{Value: "profile"},
	{Value: "threadcreate"},
	{Value: "trace"},
})

var commonParamPprofSeconds = endpoint.APIParamEnum("seconds", false, []endpoint.EnumItemDefinition{
	{Value: "10", DisplayAs: "10s"},
	{Value: "30", DisplayAs: "30s"},
	{Value: "60", DisplayAs: "60s"},
})

var commonParamPprofDebug = endpoint.APIParamEnum("debug", false, []endpoint.EnumItemDefinition{
	{Value: "0", DisplayAs: "Raw Format"},
	{Value: "1", DisplayAs: "Legacy Text Format"},
	{Value: "2", DisplayAs: "Text Format"},
})

var commonParamConfigFormat = endpoint.APIParamEnum("format", false, []endpoint.EnumItemDefinition{
	{Value: "toml"},
	{Value: "json"},
})

var apiEndpoints = []endpoint.APIDefinition{
	// TiDB Endpoints
	{
		ID:        "tidb_stats_by_table",
		Component: topo.KindTiDB,
		Path:      "/stats/dump/{db}/{table}",
		Method:    resty.MethodGet,
		PathParams: []endpoint.APIParamDefinition{
			endpoint.APIParamDBName("db", true),
			endpoint.APIParamTableName("table", true),
		},
	},
	{
		ID:        "tidb_stats_by_table_timestamp",
		Component: topo.KindTiDB,
		Path:      "/stats/dump/{db}/{table}/{yyyyMMddHHmmss}",
		Method:    resty.MethodGet,
		PathParams: []endpoint.APIParamDefinition{
			endpoint.APIParamDBName("db", true),
			endpoint.APIParamTableName("table", true),
			endpoint.APIParamText("yyyyMMddHHmmss", true),
		},
	},
	{
		ID:        "tidb_settings",
		Component: topo.KindTiDB,
		Path:      "/settings",
		Method:    resty.MethodGet,
	},
	{
		ID:        "tidb_schema",
		Component: topo.KindTiDB,
		Path:      "/schema",
		Method:    resty.MethodGet,
		QueryParams: []endpoint.APIParamDefinition{
			endpoint.APIParamTableID("table_id", false),
		},
	},
	{
		ID:        "tidb_schema_by_db",
		Component: topo.KindTiDB,
		Path:      "/schema/{db}",
		Method:    resty.MethodGet,
		PathParams: []endpoint.APIParamDefinition{
			endpoint.APIParamDBName("db", true),
		},
	},
	{
		ID:        "tidb_schema_by_table",
		Component: topo.KindTiDB,
		Path:      "/schema/{db}/{table}",
		Method:    resty.MethodGet,
		PathParams: []endpoint.APIParamDefinition{
			endpoint.APIParamDBName("db", true),
			endpoint.APIParamTableName("table", true),
		},
	},
	{
		ID:        "tidb_schema_by_table_id",
		Component: topo.KindTiDB,
		Path:      "/db-table/{tableID}",
		Method:    resty.MethodGet,
		PathParams: []endpoint.APIParamDefinition{
			endpoint.APIParamTableID("tableID", true),
		},
	},
	{
		ID:        "tidb_ddl_history",
		Component: topo.KindTiDB,
		Path:      "/ddl/history",
		Method:    resty.MethodGet,
		QueryParams: []endpoint.APIParamDefinition{
			endpoint.APIParamInt("start_job_id", false),
			endpoint.APIParamIntWithDefaultVal("limit", false, "10"),
		},
	},
	{
		ID:        "tidb_server_info",
		Component: topo.KindTiDB,
		Path:      "/info",
		Method:    resty.MethodGet,
	},
	{
		ID:        "tidb_all_servers_info",
		Component: topo.KindTiDB,
		Path:      "/info/all",
		Method:    resty.MethodGet,
	},
	{
		ID:        "tidb_all_regions_meta",
		Component: topo.KindTiDB,
		Path:      "/regions/meta",
		Method:    resty.MethodGet,
	},
	{
		ID:        "tidb_region_meta_by_id",
		Component: topo.KindTiDB,
		Path:      "/regions/{regionID}",
		Method:    resty.MethodGet,
		PathParams: []endpoint.APIParamDefinition{
			endpoint.APIParamInt("regionID", true),
		},
	},
	{
		ID:        "tidb_table_regions",
		Component: topo.KindTiDB,
		Path:      "/tables/{db}/{table}/regions",
		Method:    resty.MethodGet,
		PathParams: []endpoint.APIParamDefinition{
			endpoint.APIParamDBName("db", true),
			endpoint.APIParamTableName("table", true),
		},
	},
	{
		ID:        "tidb_hot_regions",
		Component: topo.KindTiDB,
		Path:      "/regions/hot",
		Method:    resty.MethodGet,
	},
	{
		ID:        "tidb_pprof",
		Component: topo.KindTiDB,
		Path:      "/debug/pprof/{kind}",
		Method:    resty.MethodGet,
		PathParams: []endpoint.APIParamDefinition{
			commonParamPprofKinds,
		},
		QueryParams: []endpoint.APIParamDefinition{
			commonParamPprofSeconds,
			commonParamPprofDebug,
		},
	},
	// PD Endpoints
	{
		ID:        "pd_cluster_info",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/cluster",
		Method:    resty.MethodGet,
	},
	{
		ID:        "pd_cluster_status",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/cluster/status",
		Method:    resty.MethodGet,
	},
	{
		ID:        "pd_configs_all",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/config",
		Method:    resty.MethodGet,
	},
	{
		ID:        "pd_health",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/health",
		Method:    resty.MethodGet,
	},
	{
		ID:        "pd_hot_read",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/hotspot/regions/read",
		Method:    resty.MethodGet,
	},
	{
		ID:        "pd_hot_write",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/hotspot/regions/write",
		Method:    resty.MethodGet,
	},
	{
		ID:        "pd_hot_stores",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/hotspot/stores",
		Method:    resty.MethodGet,
	},
	{
		ID:        "pd_labels_all",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/labels",
		Method:    resty.MethodGet,
	},
	{
		ID:        "pd_members_all",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/members",
		Method:    resty.MethodGet,
	},
	{
		ID:        "pd_leader",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/leader",
		Method:    resty.MethodGet,
	},
	{
		ID:        "pd_operators",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/operators",
		Method:    resty.MethodGet,
		QueryParams: []endpoint.APIParamDefinition{
			endpoint.APIParamEnum("kind", false, []endpoint.EnumItemDefinition{
				{Value: "admin"},
				{Value: "leader"},
				{Value: "region"},
			}),
		},
	},
	{
		ID:        "pd_regions_all",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/regions",
		Method:    resty.MethodGet,
	},
	{
		ID:        "pd_region_by_id",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/region/id/{regionID}",
		Method:    resty.MethodGet,
		PathParams: []endpoint.APIParamDefinition{
			endpoint.APIParamInt("regionID", true),
		},
	},
	{
		ID:        "pd_region_by_key",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/region/key/{regionKey}",
		Method:    resty.MethodGet,
		PathParams: []endpoint.APIParamDefinition{
			endpoint.APIParamPDKey("regionKey", true),
		},
	},
	{
		ID:        "pd_regions_sibling_by_id",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/regions/sibling/{regionID}",
		Method:    resty.MethodGet,
		PathParams: []endpoint.APIParamDefinition{
			endpoint.APIParamInt("regionID", true),
		},
	},
	{
		ID:        "pd_regions_store",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/regions/store/{storeID}",
		Method:    resty.MethodGet,
		PathParams: []endpoint.APIParamDefinition{
			endpoint.APIParamInt("storeID", true),
		},
	},
	{
		ID:        "pd_regions_by_top_read",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/regions/readflow",
		Method:    resty.MethodGet,
		QueryParams: []endpoint.APIParamDefinition{
			endpoint.APIParamInt("limit", false),
		},
	},
	{
		ID:        "pd_regions_by_top_write",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/regions/writeflow",
		Method:    resty.MethodGet,
		QueryParams: []endpoint.APIParamDefinition{
			endpoint.APIParamInt("limit", false),
		},
	},
	{
		ID:        "pd_regions_by_top_conf_ver",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/regions/confver",
		Method:    resty.MethodGet,
		QueryParams: []endpoint.APIParamDefinition{
			endpoint.APIParamInt("limit", false),
		},
	},
	{
		ID:        "pd_regions_by_top_version",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/regions/version",
		Method:    resty.MethodGet,
		QueryParams: []endpoint.APIParamDefinition{
			endpoint.APIParamInt("limit", false),
		},
	},
	{
		ID:        "pd_regions_by_top_size",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/regions/size",
		Method:    resty.MethodGet,
		QueryParams: []endpoint.APIParamDefinition{
			endpoint.APIParamInt("limit", false),
		},
	},
	{
		ID:        "pd_regions_by_state",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/regions/check/{state}",
		Method:    resty.MethodGet,
		PathParams: []endpoint.APIParamDefinition{
			endpoint.APIParamEnum("state", true, []endpoint.EnumItemDefinition{
				{Value: "miss-peer", DisplayAs: "Regions that miss peer"},
				{Value: "extra-peer", DisplayAs: "Regions that has extra peer"},
				{Value: "down-peer", DisplayAs: "Regions that has down peer"},
				{Value: "pending-peer", DisplayAs: "Regions that has pending peer"},
				{Value: "offline-peer", DisplayAs: "Regions that has offline peer"},
				{Value: "empty-region", DisplayAs: "Empty regions"},
			}),
		},
	},
	{
		ID:        "pd_schedulers_all",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/schedulers",
		Method:    resty.MethodGet,
		QueryParams: []endpoint.APIParamDefinition{
			endpoint.APIParamEnum("status", false, []endpoint.EnumItemDefinition{
				{Value: "paused"},
				{Value: "disabled"},
			}),
		},
	},
	{
		ID:        "pd_stores_all",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/stores",
		Method:    resty.MethodGet,
		QueryParams: []endpoint.APIParamDefinition{
			// TODO: Actually it accepts multiple values.
			endpoint.APIParamEnum("state", false, []endpoint.EnumItemDefinition{
				{Value: "0", DisplayAs: "Up"},
				{Value: "1", DisplayAs: "Offline"},
				{Value: "2", DisplayAs: "Tombstone"},
			}),
		},
	},
	{
		ID:        "pd_stores_by_label",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/labels/stores",
		Method:    resty.MethodGet,
		QueryParams: []endpoint.APIParamDefinition{
			endpoint.APIParamText("name", true),
			endpoint.APIParamText("value", true),
		},
	},
	{
		ID:        "pd_store_by_id",
		Component: topo.KindPD,
		Path:      "/pd/api/v1/store/{storeID}",
		Method:    resty.MethodGet,
		PathParams: []endpoint.APIParamDefinition{
			endpoint.APIParamInt("storeID", true),
		},
	},
	{
		ID:        "pd_pprof",
		Component: topo.KindPD,
		Path:      "/debug/pprof/{kind}",
		Method:    resty.MethodGet,
		PathParams: []endpoint.APIParamDefinition{
			commonParamPprofKinds,
		},
		QueryParams: []endpoint.APIParamDefinition{
			commonParamPprofSeconds,
			commonParamPprofDebug,
		},
	},
	// TiKV Endpoints
	{
		ID:        "tikv_config",
		Component: topo.KindTiKV,
		Path:      "/config",
		Method:    resty.MethodGet,
	},
	{
		ID:        "tikv_pprof_profile",
		Component: topo.KindTiKV,
		Path:      "/debug/pprof/profile",
		Method:    resty.MethodGet,
		QueryParams: []endpoint.APIParamDefinition{
			commonParamPprofSeconds,
		},
		BeforeSendRequest: func(req *httpclient.LazyRequest) {
			req.SetHeader("Content-Type", "application/protobuf")
		},
	},
	// TiFlash Endpoints
	{
		ID:        "tiflash_config",
		Component: topo.KindTiFlash,
		Path:      "/config",
		Method:    resty.MethodGet,
	},
	{
		ID:        "tiflash_pprof_profile",
		Component: topo.KindTiFlash,
		Path:      "/debug/pprof/profile",
		Method:    resty.MethodGet,
		QueryParams: []endpoint.APIParamDefinition{
			commonParamPprofSeconds,
		},
		BeforeSendRequest: func(req *httpclient.LazyRequest) {
			req.SetHeader("Content-Type", "application/protobuf")
		},
	},
	// TiProxy Endpoints
	{
		ID:        "tiproxy_config",
		Component: topo.KindTiProxy,
		Path:      "/api/admin/config",
		Method:    resty.MethodGet,
		QueryParams: []endpoint.APIParamDefinition{
			commonParamConfigFormat,
		},
	},
	{
		ID:        "tiproxy_pprof",
		Component: topo.KindTiProxy,
		Path:      "/debug/pprof/{kind}",
		Method:    resty.MethodGet,
		PathParams: []endpoint.APIParamDefinition{
			commonParamPprofKinds,
		},
		QueryParams: []endpoint.APIParamDefinition{
			commonParamPprofSeconds,
			commonParamPprofDebug,
		},
	},
}
