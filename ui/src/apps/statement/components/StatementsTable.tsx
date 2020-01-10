import React from 'react'
import { Table } from 'antd'
import { Statement } from './statement-types'

const tableColumns = [
  {
    title: 'SQL 类别',
    dataIndex: 'sql_category',
    key: 'sql_category'
  },
  {
    title: '总时长',
    dataIndex: 'total_duration',
    key: 'total_duration',
    sorter: (a: Statement, b: Statement) => a.total_duration - b.total_duration
  },
  {
    title: '总次数',
    dataIndex: 'total_times',
    key: 'total_times'
  },
  {
    title: '平均影响行数',
    dataIndex: 'avg_affect_lines',
    key: 'avg_affect_lines'
  },
  {
    title: '平均时长',
    dataIndex: 'avg_duration',
    key: 'avg_duration'
  },
  {
    title: '平均消耗内存',
    dataIndex: 'avg_cost_mem',
    key: 'avg_cost_mem'
  }
]

interface Props {
  statements: Statement[]
  loading: boolean
}

export default function StatementsTable({ statements, loading }: Props) {
  return (
    <Table
      columns={tableColumns}
      dataSource={statements}
      loading={loading}
      rowKey="sql_category"
      pagination={false}
    />
  )
}
