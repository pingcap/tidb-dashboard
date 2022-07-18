const MetricsItems = [
  {
    title: 'total_requests',
    queries: [
      {
        query:
          'sum(rate(tidb_executor_statement_total[$__rate_interval])) by (type)',
        name: '{type}'
      }
    ],
    unit: null,
    type: 'bar_stacked'
  },
  {
    title: 'latency',
    queries: [
      {
        query:
          'histogram_quantile(0.9, sum(rate(tidb_server_handle_query_duration_seconds_bucket[$__rate_interval])) by (le))',
        name: '95%'
      },
      {
        query:
          'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket[$__rate_interval])) by (le))',
        name: '99%'
      },
      {
        query:
          'histogram_quantile(0.999, sum(rate(tidb_server_handle_query_duration_seconds_bucket[$__rate_interval])) by (le))',
        name: '99.9%'
      }
    ],
    unit: 's',
    type: 'line'
  },
  {
    title: 'cpu',
    queries: [
      {
        query:
          '100 - avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[$__rate_interval]) ) * 100',
        name: '{instance}'
      }
    ],
    yDomain: {
      min: 0,
      max: 100
    },
    unit: 'percent',
    type: 'line'
  },
  {
    title: 'memory',
    queries: [
      {
        query: `100 - (
          avg_over_time(node_memory_MemAvailable_bytes[$__rate_interval]) or
            (
              avg_over_time(node_memory_Buffers_bytes[$__rate_interval]) +
              avg_over_time(node_memory_Cached_bytes[$__rate_interval]) +
              avg_over_time(node_memory_MemFree_bytes[$__rate_interval]) +
              avg_over_time(node_memory_Slab_bytes[$__rate_interval])
            )
          ) /
          avg_over_time(node_memory_MemTotal_bytes[$__rate_interval]) * 100`,
        name: '{instance}'
      }
    ],
    yDomain: {
      min: 0,
      max: 100
    },
    unit: 'percent',
    type: 'line'
  },
  {
    title: 'io',
    queries: [
      {
        query: 'irate(node_disk_io_time_seconds_total[$__rate_interval]) * 100',
        name: '{instance} - {device}'
      }
    ],
    unit: 'decbytes',
    type: 'line'
  }
]

export { MetricsItems }
