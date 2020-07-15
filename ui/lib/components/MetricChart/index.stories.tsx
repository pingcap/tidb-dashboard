import React from 'react'
import { MetricChart } from '..'

export default {
  title: 'MetricChart',
  component: MetricChart,
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
