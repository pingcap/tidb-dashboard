import {
  TransformNullValue,
  OverviewMetricsQueryType
} from '@pingcap/tidb-dashboard-lib'

const overviewMetrics: OverviewMetricsQueryType[] = [
  {
    title: 'total_requests',
    queries: [
      {
        promql: 'sum(rate(tidb_executor_statement_total[$__rate_interval]))',
        name: 'Total',
        type: 'line'
      },
      {
        promql:
          'sum(rate(tidb_executor_statement_total[$__rate_interval])) by (type)',
        name: '{type}',
        type: 'line'
      }
    ],
    nullValue: TransformNullValue.AS_ZERO,
    unit: 'short'
  },
  {
    title: 'latency',
    queries: [
      {
        promql:
          'sum(rate(tidb_server_handle_query_duration_seconds_sum{sql_type!="internal"}[$__rate_interval])) / sum(rate(tidb_server_handle_query_duration_seconds_count{sql_type!="internal"}[$__rate_interval]))',
        name: 'avg',
        type: 'line'
      },
      {
        promql:
          'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket{sql_type!="internal"}[$__rate_interval])) by (le))',
        name: '99',
        type: 'line'
      },
      {
        promql:
          'sum(rate(tidb_server_handle_query_duration_seconds_sum{sql_type!="internal"}[$__rate_interval])) by (sql_type) / sum(rate(tidb_server_handle_query_duration_seconds_count{sql_type!="internal"}[$__rate_interval])) by (sql_type)',
        name: 'avg-{sql_type}',
        type: 'line'
      },
      {
        promql:
          'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket{sql_type!="internal"}[$__rate_interval])) by (le,sql_type))',
        name: '99-{sql_type}',
        type: 'line'
      }
    ],
    nullValue: TransformNullValue.AS_ZERO,
    unit: 's'
  },
  {
    title: 'cpu',
    queries: [
      {
        promql: 'rate(process_cpu_seconds_total{job="tidb"}[$__rate_interval])',
        name: '{instance}',
        type: 'line'
      }
    ],
    nullValue: TransformNullValue.AS_ZERO,
    unit: 'percentunit'
  },
  {
    title: 'memory',
    queries: [
      {
        promql: 'process_resident_memory_bytes{job="tidb"}',
        name: '{instance}',
        type: 'line'
      }
    ],
    nullValue: TransformNullValue.AS_ZERO,
    unit: 'bytes'
  },
  {
    title: 'io',
    queries: [
      {
        promql:
          'sum(rate(tikv_engine_flow_bytes{db="kv", type="wal_file_bytes"}[$__rate_interval])) by (instance) + sum(rate(tikv_engine_flow_bytes{db="raft", type="wal_file_bytes"}[$__rate_interval])) by (instance) + sum(rate(raft_engine_write_size_sum[$__rate_interval])) by (instance)',
        name: '{instance}-write',
        type: 'line'
      },
      {
        promql:
          'sum(rate(tikv_engine_flow_bytes{db="kv", type=~"bytes_read|iter_bytes_read"}[$__rate_interval])) by (instance)',
        name: '{instance}-read',
        type: 'line'
      }
    ],
    unit: 'Bps'
  }
]

export { overviewMetrics }
