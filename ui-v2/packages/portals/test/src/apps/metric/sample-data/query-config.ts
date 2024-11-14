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
    ],
  },
]
