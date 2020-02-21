import React, { useMemo } from 'react'
import _ from 'lodash'
import { Link } from 'react-router-dom'
import { Table } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { HorizontalBar } from './HorizontalBar'
import { StatementOverview, StatementTimeRange } from './statement-types'
import { useTranslation } from 'react-i18next'

const tableColumns = (
  timeRange: StatementTimeRange,
  maxExecCount: number,
  maxAvgLatency: number,
  maxAvgMem: number,
  t: (string) => string
) => [
  {
    title: t('statement.common.schema'),
    dataIndex: 'schema_name',
    key: 'schema_name'
  },
  {
    title: t('statement.common.digest_text'),
    dataIndex: 'digest_text',
    key: 'digest_text',
    width: 400,
    render: (text, record: StatementOverview) => (
      <Link
        to={`/statement/detail?digest=${record.digest}&schema=${record.schema_name}&begin_time=${timeRange.begin_time}&end_time=${timeRange.end_time}`}
      >
        {text}
      </Link>
    )
  },
  {
    title: t('statement.common.sum_latency'),
    dataIndex: 'sum_latency',
    key: 'sum_latency',
    sorter: (a: StatementOverview, b: StatementOverview) =>
      a.sum_latency - b.sum_latency,
    render: text => getValueFormat('ns')(text, 2, null)
  },
  {
    title: t('statement.common.exec_count'),
    dataIndex: 'exec_count',
    key: 'exec_count',
    sorter: (a: StatementOverview, b: StatementOverview) =>
      a.exec_count - b.exec_count,
    render: text => (
      <div>
        {getValueFormat('short')(text, 0, 0)}
        <HorizontalBar
          factor={text / maxExecCount}
          color="rgba(73, 169, 238, 1)"
        />
      </div>
    )
  },
  {
    title: t('statement.common.avg_affected_rows'),
    dataIndex: 'avg_affected_rows',
    key: 'avg_affected_rows',
    sorter: (a: StatementOverview, b: StatementOverview) =>
      a.avg_affected_rows - b.avg_affected_rows,
    render: text => getValueFormat('short')(text, 0, 0)
  },
  {
    title: t('statement.common.avg_latency'),
    dataIndex: 'avg_latency',
    key: 'avg_latency',
    sorter: (a: StatementOverview, b: StatementOverview) =>
      a.avg_latency - b.avg_latency,
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
    title: t('statement.common.avg_mem'),
    dataIndex: 'avg_mem',
    key: 'avg_mem',
    sorter: (a: StatementOverview, b: StatementOverview) =>
      a.avg_mem - b.avg_mem,
    render: text => (
      <div>
        {getValueFormat('bytes')(text, 2, null)}
        <HorizontalBar
          factor={text / maxAvgMem}
          color="rgba(255, 102, 51, 1)"
        />
      </div>
    )
  }
]

interface Props {
  statements: StatementOverview[]
  loading: boolean
  timeRange: StatementTimeRange
}

export default function StatementsTable({
  statements,
  loading,
  timeRange
}: Props) {
  const {t} = useTranslation()
  const maxExecCount = useMemo(
    () => _.max(statements.map(s => s.exec_count)) || 1,
    [statements]
  )
  const maxAvgLatency = useMemo(
    () => _.max(statements.map(s => s.avg_latency)) || 1,
    [statements]
  )
  const maxAvgMem = useMemo(() => _.max(statements.map(s => s.avg_mem)) || 1, [
    statements
  ])
  const columns = useMemo(
    () => tableColumns(timeRange, maxExecCount!, maxAvgLatency!, maxAvgMem!, t),
    [timeRange, maxExecCount, maxAvgLatency, maxAvgMem, t]
  )
  return (
    <Table
      columns={columns}
      dataSource={statements}
      loading={loading}
      rowKey={(record: StatementOverview, index) => `${record.digest}_${index}`}
      pagination={false}
    />
  )
}
