import React, { useMemo } from 'react'
import _ from 'lodash'
import { Table } from 'antd'

import { StatementDetailInfo, StatementNode } from './statement-types'
import { HorizontalBar } from './HorizontalBar'

const tableColumns = (
  maxAvgDuration: number,
  maxMaxDuration: number,
  maxCostMem: number
) => [
  {
    title: 'node',
    dataIndex: 'node',
    key: 'node'
  },
  {
    title: '总时长',
    dataIndex: 'total_duration',
    key: 'total_duration',
    sorter: (a: StatementNode, b: StatementNode) =>
      a.total_duration - b.total_duration
  },
  {
    title: '总次数',
    dataIndex: 'total_times',
    key: 'total_times'
  },
  {
    title: '平均时长',
    dataIndex: 'avg_duration',
    key: 'avg_duration',
    render: text => (
      <div>
        {text}
        <HorizontalBar
          factor={text / maxAvgDuration}
          color="rgba(73, 169, 238, 1)"
        />
      </div>
    )
  },
  {
    title: '最大时长',
    dataIndex: 'max_duration',
    key: 'max_duration',
    render: text => (
      <div>
        {text}
        <HorizontalBar
          factor={text / maxMaxDuration}
          color="rgba(73, 169, 238, 1)"
        />
      </div>
    )
  },
  {
    title: '平均消耗内存',
    dataIndex: 'avg_cost_mem',
    key: 'avg_cost_mem',
    render: text => (
      <div>
        {text}
        <HorizontalBar
          factor={text / maxCostMem}
          color="rgba(245, 154, 35, 1)"
        />
      </div>
    )
  },
  {
    title: 'back_off 重试次数',
    dataIndex: 'back_off_times',
    key: 'back_off_times'
  }
]

export default function StatementDetailTable({
  detail: { nodes }
}: {
  detail: StatementDetailInfo
}) {
  const maxAvgDuration = useMemo(() => _.max(nodes.map(n => n.avg_duration)), [
    nodes
  ])
  const maxMaxDuration = useMemo(() => _.max(nodes.map(n => n.max_duration)), [
    nodes
  ])
  const maxCostMem = useMemo(() => _.max(nodes.map(n => n.avg_cost_mem)), [
    nodes
  ])
  const columns = useMemo(
    () => tableColumns(maxAvgDuration!, maxMaxDuration!, maxCostMem!),
    [maxAvgDuration, maxCostMem, maxMaxDuration]
  )

  return (
    <Table
      columns={columns}
      dataSource={nodes}
      rowKey="node"
      pagination={false}
    />
  )
}
