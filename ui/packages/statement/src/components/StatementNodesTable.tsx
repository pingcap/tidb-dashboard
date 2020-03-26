import React, { useMemo } from 'react'
import _ from 'lodash'
import { Table } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { StatementNode } from './statement-types'
import { HorizontalBar } from './HorizontalBar'
import { useTranslation } from 'react-i18next'

const tableColumns = (
  maxAvgLatency: number,
  maxMaxLatency: number,
  maxAvgMem: number,
  t: (_: string) => string
) => [
  {
    title: t('statement.detail.node'),
    dataIndex: 'address',
    key: 'address',
  },
  {
    title: t('statement.common.sum_latency'),
    dataIndex: 'sum_latency',
    key: 'sum_latency',
    sorter: (a: StatementNode, b: StatementNode) =>
      a.sum_latency! - b.sum_latency!,
    render: (text) => getValueFormat('ns')(text, 2, null),
  },
  {
    title: t('statement.common.exec_count'),
    dataIndex: 'exec_count',
    key: 'exec_count',
    sorter: (a: StatementNode, b: StatementNode) =>
      a.exec_count! - b.exec_count!,
    render: (text) => getValueFormat('short')(text, 0, 0),
  },
  {
    title: t('statement.common.avg_latency'),
    dataIndex: 'avg_latency',
    key: 'avg_latency',
    sorter: (a: StatementNode, b: StatementNode) =>
      a.avg_latency! - b.avg_latency!,
    render: (text) => (
      <div>
        {getValueFormat('ns')(text, 2, null)}
        <HorizontalBar
          factor={text / maxAvgLatency}
          color="rgba(73, 169, 238, 1)"
        />
      </div>
    ),
  },
  {
    title: t('statement.common.max_latency'),
    dataIndex: 'max_latency',
    key: 'max_latency',
    sorter: (a: StatementNode, b: StatementNode) =>
      a.max_latency! - b.max_latency!,
    render: (text) => (
      <div>
        {getValueFormat('ns')(text, 2, null)}
        <HorizontalBar
          factor={text / maxMaxLatency}
          color="rgba(73, 169, 238, 1)"
        />
      </div>
    ),
  },
  {
    title: t('statement.common.avg_mem'),
    dataIndex: 'avg_mem',
    key: 'avg_mem',
    sorter: (a: StatementNode, b: StatementNode) => a.avg_mem! - b.avg_mem!,
    render: (text) => (
      <div>
        {getValueFormat('bytes')(text, 2, null)}
        <HorizontalBar
          factor={text / maxAvgMem}
          color="rgba(245, 154, 35, 1)"
        />
      </div>
    ),
  },
  {
    title: t('statement.common.sum_backoff_times'),
    dataIndex: 'sum_backoff_times',
    key: 'sum_backoff_times',
    sorter: (a: StatementNode, b: StatementNode) =>
      a.sum_backoff_times! - b.sum_backoff_times!,
    render: (text) => getValueFormat('short')(text, 0, 0),
  },
]

export default function StatementNodesTable({
  nodes,
}: {
  nodes: StatementNode[]
}) {
  const { t } = useTranslation()
  const maxAvgLatency = useMemo(
    () => _.max(nodes.map((n) => n.avg_latency)) || 1,
    [nodes]
  )
  const maxMaxLatency = useMemo(
    () => _.max(nodes.map((n) => n.max_latency)) || 1,
    [nodes]
  )
  const maxAvgMem = useMemo(() => _.max(nodes.map((n) => n.avg_mem)) || 1, [
    nodes,
  ])
  const columns = useMemo(
    () => tableColumns(maxAvgLatency!, maxMaxLatency!, maxAvgMem!, t),
    [maxAvgLatency, maxAvgMem, maxMaxLatency, t]
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
