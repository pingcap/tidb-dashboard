import { RightOutlined } from '@ant-design/icons'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { StatementsTable, useStatement } from '@lib/apps/Statement'
import { DateTime } from '@lib/components'

export default function RecentStatements() {
  const { t } = useTranslation()
  const {
    orderOptions,
    changeOrder,

    allTimeRanges,
    validTimeRange,
    loadingStatements,
    statements,

    errors,
  } = useStatement(undefined, false)

  return (
    <StatementsTable
      key={`statement_${statements.length}`}
      visibleColumnKeys={{
        digest_text: true,
        sum_latency: true,
        avg_latency: true,
        related_schemas: true,
      }}
      visibleItemsCount={10}
      loading={loadingStatements}
      statements={statements}
      timeRange={validTimeRange}
      orderBy={orderOptions.orderBy}
      desc={orderOptions.desc}
      onChangeOrder={changeOrder}
      errors={errors}
      title={
        <Link to="/statement">
          {t('overview.top_statements.title')} <RightOutlined />
        </Link>
      }
      subTitle={
        allTimeRanges.length > 0 && (
          <span>
            <DateTime.Calendar
              unixTimestampMs={(validTimeRange.begin_time ?? 0) * 1000}
            />{' '}
            ~{' '}
            <DateTime.Calendar
              unixTimestampMs={(validTimeRange.end_time ?? 0) * 1000}
            />
          </span>
        )
      }
    />
  )
}
