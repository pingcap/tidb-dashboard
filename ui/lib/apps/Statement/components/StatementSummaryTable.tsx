import React from 'react'
import { Table } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { FormatHighlightSQL } from '@lib/components'
import { StatementDetail as StatementDetailInfo } from '@lib/client'
import { DATE_TIME_FORMAT } from './statement-types'

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
      content: <FormatHighlightSQL sql={detail.digest_text!} />,
    },
    {
      kind: t('statement.detail.query_sample_text'),
      content: <FormatHighlightSQL sql={detail.query_sample_text!} />,
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
