import React, { useMemo } from 'react'
import _ from 'lodash'
import { Link } from 'react-router-dom'
import { Table } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { HorizontalBar } from './HorizontalBar'
import { Statement } from './statement-types'

const tableColumns = (
  maxTotalTimes: number,
  maxAvgDuration: number,
  maxCostMem: number
) => [
  {
    title: 'SQL 类别',
    dataIndex: 'sql_category',
    key: 'sql_category',
    render: text => (
      <Link to={`/statement/detail?sql_category=${text}`}>{text}</Link>
    )
  },
  {
    title: '总时长',
    dataIndex: 'total_duration',
    key: 'total_duration',
    sorter: (a: Statement, b: Statement) => a.total_duration - b.total_duration,
    render: text => getValueFormat('s')(text, 2, null)
  },
  {
    title: '总次数',
    dataIndex: 'total_times',
    key: 'total_times',
    render: text => (
      <div>
        {getValueFormat('short')(text, 0, 0)}
        <HorizontalBar
          factor={text / maxTotalTimes}
          color="rgba(73, 169, 238, 1)"
        />
      </div>
    )
  },
  {
    title: '平均影响行数',
    dataIndex: 'avg_affect_lines',
    key: 'avg_affect_lines',
    render: text => getValueFormat('short')(text, 0, 0)
  },
  {
    title: '平均时长',
    dataIndex: 'avg_duration',
    key: 'avg_duration',
    render: text => (
      <div>
        {getValueFormat('ms')(text, 2, null)}
        <HorizontalBar
          factor={text / maxAvgDuration}
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
        {getValueFormat('mbytes')(text, 2, null)}
        <HorizontalBar
          factor={text / maxCostMem}
          color="rgba(255, 102, 51, 1)"
        />
      </div>
    )
  }
]

interface Props {
  statements: Statement[]
  loading: boolean
}

export default function StatementsTable({ statements, loading }: Props) {
  const maxTotalTimes = useMemo(
    () => _.max(statements.map(s => s.total_times)),
    [statements]
  )
  const maxAvgDuration = useMemo(
    () => _.max(statements.map(s => s.avg_duration)),
    [statements]
  )
  const maxCostMem = useMemo(() => _.max(statements.map(s => s.avg_cost_mem)), [
    statements
  ])
  const columns = useMemo(
    () => tableColumns(maxTotalTimes!, maxAvgDuration!, maxCostMem!),
    [maxAvgDuration, maxCostMem, maxTotalTimes]
  )
  return (
    <Table
      columns={columns}
      dataSource={statements}
      loading={loading}
      rowKey="sql_category"
      pagination={false}
    />
  )
}
