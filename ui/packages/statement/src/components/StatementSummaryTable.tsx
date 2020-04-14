import React from 'react'
import { Table } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import sqlFormatter from 'sql-formatter-plus'
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql'
import atomOneLight from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light'
import { StatementDetailInfo, DATE_TIME_FORMAT } from './statement-types'

SyntaxHighlighter.registerLanguage('sql', sql)

type align = 'left' | 'right' | 'center'

const columns = [
  {
    title: 'kind',
    dataIndex: 'kind',
    key: 'kind',
    align: 'center' as align,
    width: 160,
  },
  {
    title: 'content',
    dataIndex: 'content',
    key: 'content',
    align: 'left' as align,
  },
]

type Props = {
  detail: StatementDetailInfo
  beginTime: string
  endTime: string
}

export default function StatementSummaryTable({
  detail,
  beginTime,
  endTime,
}: Props) {
  const { t } = useTranslation()

  const dataSource = [
    {
      kind: t('statement.common.schemas'),
      content: detail.schemas,
    },
    {
      kind: t('statement.detail.time_range'),
      content: `${dayjs
        .unix(parseInt(beginTime))
        .format(DATE_TIME_FORMAT)} ~ ${dayjs
        .unix(parseInt(endTime))
        .format(DATE_TIME_FORMAT)}`,
    },
    {
      kind: t('statement.common.digest_text'),
      content: (
        <SyntaxHighlighter language="sql" style={atomOneLight}>
          {sqlFormatter.format(detail.digest_text, { uppercase: true })}
        </SyntaxHighlighter>
      ),
    },
    {
      kind: t('statement.detail.query_sample_text'),
      content: (
        <SyntaxHighlighter language="sql" style={atomOneLight}>
          {sqlFormatter.format(detail.query_sample_text, { uppercase: true })}
        </SyntaxHighlighter>
      ),
    },
    {
      kind: t('statement.detail.last_seen'),
      content: dayjs(detail.last_seen).format(DATE_TIME_FORMAT),
    },
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
