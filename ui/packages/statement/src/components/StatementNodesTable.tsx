import React, { useMemo } from 'react'
import _ from 'lodash'
import { Table } from 'antd'
import { useTranslation } from 'react-i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { StatementNode } from './statement-types'
import { TextWithHorizontalBar, BLUE_COLOR, RED_COLOR } from './HorizontalBar'

const tableColumns = (
  maxSumLatency: number,
  maxExecCount: number,
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
    render: (value) => (
      <TextWithHorizontalBar
        text={getValueFormat('ns')(value, 2, null)}
        factor={value / maxSumLatency}
        color={BLUE_COLOR}
      />
    ),
  },
  {
    title: t('statement.common.exec_count'),
    dataIndex: 'exec_count',
    key: 'exec_count',
    sorter: (a: StatementNode, b: StatementNode) =>
      a.exec_count! - b.exec_count!,
    render: (value) => (
      <TextWithHorizontalBar
        text={getValueFormat('short')(value, 0, 0)}
        factor={value / maxExecCount}
        color={BLUE_COLOR}
      />
    ),
  },
  {
    title: t('statement.common.avg_latency'),
    dataIndex: 'avg_latency',
    key: 'avg_latency',
    sorter: (a: StatementNode, b: StatementNode) =>
      a.avg_latency! - b.avg_latency!,
    render: (value) => (
      <TextWithHorizontalBar
        text={getValueFormat('ns')(value, 2, null)}
        factor={value / maxAvgLatency}
        color={BLUE_COLOR}
      />
    ),
  },
  {
    title: t('statement.common.max_latency'),
    dataIndex: 'max_latency',
    key: 'max_latency',
    sorter: (a: StatementNode, b: StatementNode) =>
      a.max_latency! - b.max_latency!,
    render: (value) => (
      <TextWithHorizontalBar
        text={getValueFormat('ns')(value, 2, null)}
        factor={value / maxMaxLatency}
        color={BLUE_COLOR}
      />
    ),
  },
  {
    title: t('statement.common.avg_mem'),
    dataIndex: 'avg_mem',
    key: 'avg_mem',
    sorter: (a: StatementNode, b: StatementNode) => a.avg_mem! - b.avg_mem!,
    render: (value) => (
      <TextWithHorizontalBar
        text={getValueFormat('bytes')(value, 2, null)}
        factor={value / maxAvgMem}
        color={RED_COLOR}
      />
    ),
  },
  {
    title: t('statement.common.sum_backoff_times'),
    dataIndex: 'sum_backoff_times',
    key: 'sum_backoff_times',
    sorter: (a: StatementNode, b: StatementNode) =>
      a.sum_backoff_times! - b.sum_backoff_times!,
    render: (value) => getValueFormat('short')(value, 0, 0),
  },
]

export default function StatementNodesTable({
  nodes,
}: {
  nodes: StatementNode[]
}) {
  const { t } = useTranslation()
  const maxSumLatency = useMemo(
    () => _.max(nodes.map((n) => n.sum_latency)) || 1,
    [nodes]
  )
  const maxExecCount = useMemo(
    () => _.max(nodes.map((n) => n.exec_count)) || 1,
    [nodes]
  )
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
    () =>
      tableColumns(
        maxSumLatency,
        maxExecCount,
        maxAvgLatency,
        maxMaxLatency,
        maxAvgMem,
        t
      ),
    [maxSumLatency, maxExecCount, maxAvgLatency, maxAvgMem, maxMaxLatency, t]
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
