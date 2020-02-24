import React from 'react'
import { Table } from 'antd'
import { StatementDetailInfo } from './statement-types'

type align = 'left' | 'right' | 'center'

const columns = [
  {
    title: 'kind',
    dataIndex: 'kind',
    key: 'kind',
    align: 'center' as align
  },
  {
    title: 'content',
    dataIndex: 'content',
    key: 'content',
    align: 'left' as align
  }
]

export default function StatementSummaryTable({
  detail: { summary }
}: {
  detail: StatementDetailInfo
}) {
  const dataSource = [
    {
      kind: 'SQL 类别',
      content: summary.sql_category
    },
    {
      kind: '最后出现 SQL 语句',
      content: summary.last_sql
    },
    {
      kind: '最后出现时间',
      content: summary.last_time
    },
    {
      kind: 'Schema',
      content: summary.schemas.join(',')
    }
  ]

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      rowKey="kind"
      pagination={false}
      showHeader={false}
    />
  )
}
