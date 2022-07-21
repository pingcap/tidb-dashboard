import { TransformNullValue } from '@lib/utils/prometheus'

const overviewMetrics = [
  {
    title: 'total_requests',
    queries: [
      {
        query: 'sum(rate(tidb_executor_statement_total[$__rate_interval]))',
        name: 'Total'
      },
      {
        query:
          'sum(rate(tidb_executor_statement_total[$__rate_interval])) by (type)',
        name: '{type}'
      }
    ],
    nullValue: TransformNullValue.AS_ZERO,
    unit: 'qps',
    type: 'line'
  },
  {
    title: 'latency',
    queries: [
      {
        query:
          'sum(rate(tidb_server_handle_query_duration_seconds_sum{sql_type!="internal"}[$__rate_interval])) / sum(rate(tidb_server_handle_query_duration_seconds_count{sql_type!="internal"}[$__rate_interval]))',
        name: 'avg'
      },
      {
        query:
          'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket{sql_type!="internal"}[$__rate_interval])) by (le))',
        name: '99'
      },
      {
        query:
          'sum(rate(tidb_server_handle_query_duration_seconds_sum{sql_type!="internal"}[$__rate_interval])) by (sql_type) / sum(rate(tidb_server_handle_query_duration_seconds_count{sql_type!="internal"}[$__rate_interval])) by (sql_type)',
        name: 'avg-{sql_type}'
      },
      {
        query:
          'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket{sql_type!="internal"}[$__rate_interval])) by (le,sql_type))',
        name: '99-{sql_type}'
      }
    ],
    nullValue: TransformNullValue.AS_ZERO,
    unit: 's',
    type: 'line'
  },
  {
    title: 'cpu',
    queries: [
      {
        query: 'rate(process_cpu_seconds_total{job="tidb"}[$__rate_interval])',
        name: '{instance}'
      }
    ],
    nullValue: TransformNullValue.AS_ZERO,
    unit: 'percentunit',
    type: 'line'
  },
  {
    title: 'memory',
    queries: [
      {
        query: 'process_resident_memory_bytes{job="tidb"}',
        name: '{instance}'
      }
    ],
    nullValue: TransformNullValue.AS_ZERO,
    unit: 'bytes',
    type: 'line'
  },
  {
    title: 'io',
    queries: [
      {
        query:
          'sum(rate(tikv_engine_flow_bytes{db="raft", type="wal_file_bytes"}[$__rate_interval])) by (instance) + sum(rate(raft_engine_write_size_sum[$__rate_interval])) by (instance)',
        name: '{instance}-write'
      },
      {
        query:
          'sum(rate(tikv_engine_flow_bytes{db="kv", type=~"bytes_read|iter_bytes_read"}[$__rate_interval])) by (instance)',
        name: '{instance}-read'
      }
    ],
    unit: 'Bps',
    type: 'line'
  }
]

export { overviewMetrics }
