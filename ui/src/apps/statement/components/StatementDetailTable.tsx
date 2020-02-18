import React, { useMemo } from 'react'
import _ from 'lodash'
import { Table } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { StatementNode } from './statement-types'
import { HorizontalBar } from './HorizontalBar'

const tableColumns = (
  maxAvgLatency: number,
  maxMaxLatency: number,
  maxAvgMem: number
) => [
  {
    title: 'node',
    dataIndex: 'address',
    key: 'address'
  },
  {
    title: '总时长',
    dataIndex: 'sum_latency',
    key: 'sum_latency',
    sorter: (a: StatementNode, b: StatementNode) =>
      a.sum_latency - b.sum_latency,
    render: text => getValueFormat('ns')(text, 2, null)
  },
  {
    title: '总次数',
    dataIndex: 'exec_count',
    key: 'exec_count',
    render: text => getValueFormat('short')(text, 0, 0)
  },
  {
    title: '平均时长',
    dataIndex: 'avg_latency',
    key: 'avg_latency',
    render: text => (
      <div>
        {getValueFormat('ns')(text, 2, null)}
        <HorizontalBar
          factor={text / maxAvgLatency}
          color="rgba(73, 169, 238, 1)"
        />
      </div>
    )
  },
  {
    title: '最大时长',
    dataIndex: 'max_latency',
    key: 'max_latency',
    render: text => (
      <div>
        {getValueFormat('ns')(text, 2, null)}
        <HorizontalBar
          factor={text / maxMaxLatency}
          color="rgba(73, 169, 238, 1)"
        />
      </div>
    )
  },
  {
    title: '平均消耗内存',
    dataIndex: 'avg_mem',
    key: 'avg_mem',
    render: text => (
      <div>
        {getValueFormat('bytes')(text, 2, null)}
        <HorizontalBar
          factor={text / maxAvgMem}
          color="rgba(245, 154, 35, 1)"
        />
      </div>
    )
  },
  {
    title: 'back_off 重试次数',
    dataIndex: 'sum_backoff_times',
    key: 'sum_backoff_times',
    render: text => getValueFormat('short')(text, 0, 0)
  }
]

export default function StatementDetailTable({
  nodes
}: {
  nodes: StatementNode[]
}) {
  const maxAvgLatency = useMemo(
    () => _.max(nodes.map(n => n.avg_latency)) || 1,
    [nodes]
  )
  const maxMaxLatency = useMemo(
    () => _.max(nodes.map(n => n.max_latency)) || 1,
    [nodes]
  )
  const maxAvgMem = useMemo(() => _.max(nodes.map(n => n.avg_mem)) || 1, [
    nodes
  ])
  const columns = useMemo(
    () => tableColumns(maxAvgLatency!, maxMaxLatency!, maxAvgMem!),
    [maxAvgLatency, maxAvgMem, maxMaxLatency]
  )

  return (
    <Table
      columns={columns}
      dataSource={nodes}
      rowKey={(record: StatementNode, index) => `${record.address}_${index}`}
      pagination={false}
    />
  )
}
