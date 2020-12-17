import { RightOutlined } from '@ant-design/icons'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { DateTime } from '@lib/components'
import {
  SlowQueriesTable,
  useSlowQueryTableController,
  DEF_SLOW_QUERY_COLUMN_KEYS,
  DEF_SLOW_QUERY_OPTIONS,
} from '@lib/apps/SlowQuery'

export default function RecentSlowQueries() {
  const { t } = useTranslation()
  const controller = useSlowQueryTableController(
    null,
    DEF_SLOW_QUERY_COLUMN_KEYS,
    false,
    { ...DEF_SLOW_QUERY_OPTIONS, limit: 10 },
    false
  )
  const {
    queryTimeRange: { beginTime, endTime },
  } = controller

  return (
    <SlowQueriesTable
      controller={controller}
      title={
        <Link to="/slow_query">
          {t('overview.recent_slow_query.title')} <RightOutlined />
        </Link>
      }
      subTitle={
        <span>
          <DateTime.Calendar unixTimestampMs={beginTime * 1000} /> ~{' '}
          <DateTime.Calendar unixTimestampMs={endTime * 1000} />
        </span>
      }
    />
  )
}
