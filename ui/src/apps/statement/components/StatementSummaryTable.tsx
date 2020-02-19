import React from 'react'
import { Table } from 'antd'
import moment from 'moment'
import { StatementDetailInfo } from './statement-types'

type align = 'left' | 'right' | 'center'

const columns = [
  {
    title: 'kind',
    dataIndex: 'kind',
    key: 'kind',
    align: 'center' as align,
    width: 160
  },
  {
    title: 'content',
    dataIndex: 'content',
    key: 'content',
    align: 'left' as align
  }
]

type Props = {
  detail: StatementDetailInfo
  beginTime: string
  endTime: string
}

export default function StatementSummaryTable({
  detail,
  beginTime,
  endTime
}: Props) {
  const dataSource = [
    {
      kind: 'Schema',
      content: detail.schema_name
    },
    {
      kind: 'Time Range',
      content: `${beginTime} ~ ${endTime}`
    },
    {
      kind: 'SQL 类别',
      content: detail.digest_text
    },
    {
      kind: '最后出现 SQL 语句',
      content: detail.query_sample_text
    },
    {
      kind: '最后出现时间',
      content: moment(detail.last_seen).format('YYYY-MM-DD HH:mm:ss')
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
