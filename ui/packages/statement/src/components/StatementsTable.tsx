import React, { useMemo } from 'react'
import _ from 'lodash'
import { Link } from 'react-router-dom'
import { Table, Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { TextWithHorizontalBar, BLUE_COLOR, RED_COLOR } from './HorizontalBar'
import { StatementOverview, StatementTimeRange } from './statement-types'
import { useTranslation } from 'react-i18next'
import styles from './styles.module.css'

const tableColumns = (
  t: (string) => string,
  concise: boolean,
  timeRange: StatementTimeRange,
  maxSumLatency: number,
  maxExecCount: number,
  maxAvgLatency: number,
  maxAvgMem: number,
  detailPagePath?: string
) => {
  const columns = [
    {
      title: t('statement.common.schemas'),
      dataIndex: 'schemas',
      key: 'schemas',
    },
    {
      title: t('statement.common.digest_text'),
      dataIndex: 'digest_text',
      key: 'digest_text',
      render: (value, record: StatementOverview) => (
        <Link
          to={`${detailPagePath || '/statement/detail'}?digest=${
            record.digest
          }&schema=${record.schema_name}&begin_time=${
            timeRange.begin_time
          }&end_time=${timeRange.end_time}`}
        >
          <Tooltip title={value} placement="right">
            <div className={styles.digest_column}>{value}</div>
          </Tooltip>
        </Link>
      ),
    },
    {
      title: t('statement.common.sum_latency'),
      dataIndex: 'sum_latency',
      key: 'sum_latency',
      sorter: (a: StatementOverview, b: StatementOverview) =>
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
      sorter: (a: StatementOverview, b: StatementOverview) =>
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
      sorter: (a: StatementOverview, b: StatementOverview) =>
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
      title: t('statement.common.avg_mem'),
      dataIndex: 'avg_mem',
      key: 'avg_mem',
      sorter: (a: StatementOverview, b: StatementOverview) =>
        a.avg_mem! - b.avg_mem!,
      render: (value) => (
        <TextWithHorizontalBar
          text={getValueFormat('bytes')(value, 2, null)}
          factor={value / maxAvgMem}
          color={RED_COLOR}
        />
      ),
    },
    {
      title: t('statement.common.avg_affected_rows'),
      dataIndex: 'avg_affected_rows',
      key: 'avg_affected_rows',
      sorter: (a: StatementOverview, b: StatementOverview) =>
        a.avg_affected_rows! - b.avg_affected_rows!,
      render: (value) => getValueFormat('short')(value, 0, 0),
    },
  ]
  if (concise) {
    return columns.filter((col) =>
      ['schemas', 'digest_text', 'sum_latency', 'avg_latency'].includes(col.key)
    )
  }
  return columns
}

interface Props {
  statements: StatementOverview[]
  loading: boolean
  timeRange: StatementTimeRange
  detailPagePath?: string
  concise?: boolean
}

export default function StatementsTable({
  statements,
  loading,
  timeRange,
  detailPagePath,
  concise,
}: Props) {
  const { t } = useTranslation()
  // TODO: extract all following calculations into custom hook for easy reuse
  const maxSumLatency = useMemo(
    () => _.max(statements.map((s) => s.sum_latency)) || 1,
    [statements]
  )
  const maxExecCount = useMemo(
    () => _.max(statements.map((s) => s.exec_count)) || 1,
    [statements]
  )
  const maxAvgLatency = useMemo(
    () => _.max(statements.map((s) => s.avg_latency)) || 1,
    [statements]
  )
  const maxAvgMem = useMemo(
    () => _.max(statements.map((s) => s.avg_mem)) || 1,
    [statements]
  )
  const columns = useMemo(
    () =>
      tableColumns(
        t,
        concise || false,
        timeRange,
        maxSumLatency,
        maxExecCount!,
        maxAvgLatency!,
        maxAvgMem!,
        detailPagePath
      ),
    [
      t,
      concise,
      timeRange,
      maxSumLatency,
      maxExecCount,
      maxAvgLatency,
      maxAvgMem,
    ]
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
