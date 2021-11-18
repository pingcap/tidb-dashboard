import React from 'react'
import MetricChart from '.'

export default {
  title: 'MetricChart',
}

export const QPS = () => (
  <MetricChart
    title="QPS"
    series={[
      {
        query: 'sum(rate(tidb_server_query_total[1m])) by (result)',
        name: 'Queries {result}',
      },
    ]}
    unit="ops"
    type="bar"
  />
)

export const Latency = () => (
  <MetricChart
    title="Latency"
    series={[
      {
        query:
          'histogram_quantile(0.999, sum(rate(tidb_server_handle_query_duration_seconds_bucket[1m])) by (le))',
        name: '99.9%',
      },
      {
        query:
          'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket[1m])) by (le))',
        name: '99%',
      },
      {
        query:
          'histogram_quantile(0.9, sum(rate(tidb_server_handle_query_duration_seconds_bucket[1m])) by (le))',
        name: '90%',
      },
    ]}
    unit="s"
    type="line"
  />
)
