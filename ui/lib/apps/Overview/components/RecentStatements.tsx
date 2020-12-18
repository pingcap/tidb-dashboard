import { RightOutlined } from '@ant-design/icons'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import {
  StatementsTable,
  useStatementTableController,
} from '@lib/apps/Statement'
import { DateTime, IColumnKeys } from '@lib/components'

const visibleColumnKeys: IColumnKeys = {
  digest_text: true,
  sum_latency: true,
  avg_latency: true,
  related_schemas: true,
}

export default function RecentStatements() {
  const { t } = useTranslation()
  const controller = useStatementTableController(
    null,
    visibleColumnKeys,
    false,
    undefined,
    false
  )
  const {
    allTimeRanges,
    validTimeRange: { begin_time, end_time },
  } = controller

  return (
    <StatementsTable
      visibleItemsCount={10}
      controller={controller}
      title={
        <Link to="/statement">
          {t('overview.top_statements.title')} <RightOutlined />
        </Link>
      }
      subTitle={
        allTimeRanges.length > 0 && (
          <span>
            <DateTime.Calendar unixTimestampMs={(begin_time ?? 0) * 1000} /> ~{' '}
            <DateTime.Calendar unixTimestampMs={(end_time ?? 0) * 1000} />
          </span>
        )
      }
    />
  )
}
