import { QueryConfig, TransformNullValue } from 'metrics-chart'

export type MetricConfig = {
  title: string
  queries: QueryConfig[]
  unit: string
  nullValue?: TransformNullValue
}

export const metrics: MetricConfig[] = [
  {
    title: 'Total RU Consumed',
    queries: [
      {
        promql:
          'sum(rate(resource_manager_resource_unit_read_request_unit_sum[1m])) + sum(rate(resource_manager_resource_unit_write_request_unit_sum[1m]))',
        name: 'Total RU',
        type: 'line'
      }
    ],
    unit: 'short',
    nullValue: TransformNullValue.AS_ZERO
  },
  {
    title: 'RU Consumed by Resource Groups',
    queries: [
      {
        promql:
          'sum(rate(resource_manager_resource_unit_read_request_unit_sum[1m])) by (name) + sum(rate(resource_manager_resource_unit_write_request_unit_sum[1m])) by (name)',
        name: '{name}',
        type: 'line'
      }
    ],
    unit: 'short',
    nullValue: TransformNullValue.AS_ZERO
  },
  {
    title: 'TiDB CPU Usage',
    queries: [
      {
        promql: 'rate(process_cpu_seconds_total{job="tidb"}[30s])',
        name: '{instance}',
        type: 'line'
      },
      {
        promql: 'tidb_server_maxprocs',
        name: 'Limit-{instance}',
        type: 'line'
      }
    ],
    unit: 'percentunit',
    nullValue: TransformNullValue.AS_ZERO
  },
  {
    title: 'TiKV CPU Usage',
    queries: [
      {
        promql:
          'sum(rate(tikv_thread_cpu_seconds_total[$__rate_interval])) by (instance)',
        name: '{instance}',
        type: 'line'
      },
      {
        promql: 'tikv_server_cpu_cores_quota',
        name: 'Limit-{instance}',
        type: 'line'
      }
    ],
    unit: 'percentunit'
  },
  {
    title: 'TiKV IO MBps',
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
