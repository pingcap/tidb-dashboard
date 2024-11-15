import {
  SinglePanelConfig,
  TransformNullValue,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"

export const queryConfig: SinglePanelConfig[] = [
  {
    category: "Cluster Status",
    charts: [
      {
        title: "Query Per Second",
        label:
          "The number of SQL statements executed per second, which are collected by SQL types, such as `SELECT`, `INSERT`, and `UPDATE`.",
        queries: [
          {
            promql: `sum(rate(tidb_executor_statement_total{db!=""}[$__rate_interval])) or vector(0)`,
            name: "All",
            type: "line",
          },
          {
            promql: `sum(rate(tidb_executor_statement_total{db!=""}[$__rate_interval])) by (type)`,
            name: "{type}",
            type: "line",
          },
        ],
        nullValue: TransformNullValue.AS_ZERO,
        unit: "short",
      },
      {
        title: "Used Storage Size",
        label: "The size of the row store and the size of the column store.",
        queries: [
          {
            promql:
              'quantile_over_time(0.5, sum(avg by(keyspace_id, region_id) (tikv_store_size_bytes{type="used"}))[$__rate_interval]) or vector(0)',
            name: "Row-based storage",
            type: "line",
          },
          {
            promql:
              'quantile_over_time(0.5, sum(avg by(keyspace_id, region_id) (tikv_store_size_bytes{type="tiflash_used"}))[$__rate_interval]) or vector(0)',
            name: "Columnar storage",
            type: "line",
          },
        ],
        nullValue: TransformNullValue.AS_ZERO,
        unit: "bytes",
      },
    ],
  },
  {
    category: "Database Status",
    charts: [
      {
        title: "QPS Per DB",
        label:
          "The number of SQL statements executed per second on every Database, which are collected by SQL types, such as `SELECT`, `INSERT`, and `UPDATE`.",
        queries: [
          {
            promql: `sum(rate(tidb_executor_statement_total{db!=""}[$__rate_interval])) default 0`,
            name: "All",
            type: "line",
          },
          {
            promql: `sum(rate(tidb_executor_statement_total{db!=""}[$__rate_interval])) by (db) >0 and on(db) (sum(rate(tidb_server_handle_query_duration_seconds_count{db!=""}[$__rate_interval])) by (db) >0)`,
            name: "{db}",
            type: "line",
          },
        ],
        nullValue: TransformNullValue.AS_ZERO,
        unit: "short",
      },
      {
        title: "Average Query Duration Per DB",
        label:
          "The duration from receiving a request from the client to a database until the database executes the request and returns the result to the client.",
        queries: [
          {
            promql:
              'sum(rate(tidb_server_handle_query_duration_seconds_sum{db!="",sql_type!="internal"}[$__rate_interval])) / sum(rate(tidb_server_handle_query_duration_seconds_count{db!="",sql_type!="internal"}[$__rate_interval])) default 0',
            name: "All",
            type: "line",
          },
          {
            promql:
              '(sum(rate(tidb_server_handle_query_duration_seconds_sum{db!="",sql_type!="internal"}[$__rate_interval])) by (db) / sum(rate(tidb_server_handle_query_duration_seconds_count{db!="",sql_type!="internal"}[$__rate_interval])) by (db) > 0) and on (db) (sum(rate(tidb_executor_statement_total{db!="",sql_type!="internal"}[$__rate_interval])) by (db) >0)',
            name: "{db}",
            type: "line",
          },
        ],
        nullValue: TransformNullValue.AS_ZERO,
        unit: "s",
      },
    ],
  },
]
