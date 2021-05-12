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
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

var tidbStatsDump EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_stats_dump",
	Component: model.NodeKindTiDB,
	Path:      "/stats/dump/{db}/{table}",
	Method:    EndpointMethodGet,
	PathParams: []EndpointAPIParam{
		{
			Name:  "db",
			Model: EndpointAPIParamModelText,
		},
		{
			Name:  "table",
			Model: EndpointAPIParamModelText,
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
			Model: EndpointAPIParamModelText,
		},
		{
			Name:  "table",
			Model: EndpointAPIParamModelText,
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
}

var tidbSchemaWithDB EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_schema_db",
	Component: model.NodeKindTiDB,
	Path:      "/schema/{db}",
	Method:    EndpointMethodGet,
	PathParams: []EndpointAPIParam{
		{
			Name:  "db",
			Model: EndpointAPIParamModelText,
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
			Model: EndpointAPIParamModelText,
		},
		{
			Name:  "table",
			Model: EndpointAPIParamModelText,
		},
	},
}

var tidbSchemaWithTableID EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_schema_tableid",
	Component: model.NodeKindTiDB,
	Path:      "/db-table/{tableID}",
	Method:    EndpointMethodGet,
	PathParams: []EndpointAPIParam{
		{
			Name:  "tableID",
			Model: EndpointAPIParamModelText,
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

var endpointAPIList []EndpointAPIModel = []EndpointAPIModel{
	tidbStatsDump,
	tidbStatsDumpWithTimestamp,
	tidbConfig,
	tidbSchema,
	tidbSchemaWithDB,
	tidbSchemaWithDBTable,
	tidbSchemaWithTableID,
	tidbDDLHistory,
	tidbInfo,
	tidbInfoAll,
	tidbRegionsMeta,
}
