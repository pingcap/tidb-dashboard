import React, { useMemo } from 'react'
import _ from 'lodash'
import { Link } from 'react-router-dom'
import { Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import { CardTableV2 } from '@pingcap-incubator/dashboard_components'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { TextWithHorizontalBar } from './HorizontalBar'
import {
  StatementOverview,
  StatementTimeRange,
  StatementMaxMinVals,
} from './statement-types'
import styles from './styles.module.less'
import { useMaxMin } from './use-max-min'

const tableColumns = (
  t: (string) => string,
  concise: boolean,
  timeRange: StatementTimeRange,
  maxMins: StatementMaxMinVals,
  detailPagePath?: string
) => {
  const columns = [
    {
      name: t('statement.common.schemas'),
      key: 'schemas',
      minWidth: 120,
      maxWidth: 160,
      isResizable: true,
      onRender: (rec) => rec.schemas,
    },
    {
      name: t('statement.common.digest_text'),
      key: 'digest_text',
      minWidth: 200,
      maxWidth: 250,
      isResizable: true,
      onRender: (rec: StatementOverview) => (
        <Link
          to={`${detailPagePath || '/statement/detail'}?digest=${
            rec.digest
          }&schema=${rec.schema_name}&begin_time=${
            timeRange.begin_time
          }&end_time=${timeRange.end_time}`}
        >
          <Tooltip title={rec.digest_text} placement="right">
            <div className={styles.digest_column}>{rec.digest_text}</div>
          </Tooltip>
        </Link>
      ),
    },
    {
      name: t('statement.common.sum_latency'),
      key: 'sum_latency',
      minWidth: 170,
      isRowHeader: true,
      isSorted: true,
      isSortedDescending: false,
      onColumnClick: () => {},
      onRender: (rec) => (
        <TextWithHorizontalBar
          text={getValueFormat('ns')(rec.sum_latency, 1, null)}
          normalVal={rec.sum_latency / maxMins.maxSumLatency}
        />
      ),
    },
    {
      name: t('statement.common.avg_latency'),
      key: 'avg_latency',
      minWidth: 170,
      onRender: (rec) => {
        const tooltipContent = `
AVG: ${getValueFormat('ns')(rec.avg_latency, 1, null)}
MIN: ${getValueFormat('ns')(rec.avg_latency * 0.5, 1, null)}
MAX: ${getValueFormat('ns')(rec.avg_latency * 1.2, 1, null)}`
        return (
          <TextWithHorizontalBar
            tooltip={<pre>{tooltipContent.trim()}</pre>}
            text={getValueFormat('ns')(rec.avg_latency, 1, null)}
            normalVal={rec.avg_latency / maxMins.maxAvgLatency}
            maxVal={(rec.avg_latency / maxMins.maxAvgLatency) * 1.2}
            minVal={(rec.avg_latency / maxMins.maxAvgLatency) * 0.5}
          />
        )
      },
    },
    {
      name: t('statement.common.exec_count'),
      key: 'exec_count',
      minWidth: 170,
      onRender: (rec) => (
        <TextWithHorizontalBar
          text={getValueFormat('short')(rec.exec_count, 0, 0)}
          normalVal={rec.exec_count / maxMins.maxExecCount}
        />
      ),
    },
    {
      name: t('statement.common.avg_mem'),
      key: 'avg_mem',
      minWidth: 170,
      onRender: (rec) => (
        <TextWithHorizontalBar
          text={getValueFormat('decbytes')(rec.avg_mem, 1, null)}
          normalVal={rec.avg_mem / maxMins.maxAvgMem}
          maxVal={(rec.avg_mem / maxMins.maxAvgMem) * 1.2}
        />
      ),
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
  const maxMins = useMaxMin(statements)
  const columns = useMemo(
    () => tableColumns(t, concise || false, timeRange, maxMins, detailPagePath),
    [t, concise, timeRange, maxMins]
  )

  return (
    <CardTableV2
      loading={loading}
      items={statements}
      columns={columns}
      getKey={(item) => item.digest_text}
      setKey="none"
      isHeaderVisible={true}
    />
  )
}
