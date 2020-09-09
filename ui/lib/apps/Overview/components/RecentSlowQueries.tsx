import { RightOutlined } from '@ant-design/icons'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { DateTime } from '@lib/components'
import { SlowQueriesTable, useSlowQuery } from '@lib/apps/SlowQuery'
import { DEF_SLOW_QUERY_OPTIONS } from '@lib/apps/SlowQuery/utils/useSlowQuery'
import { DEF_SLOW_QUERY_COLUMN_KEYS } from '@lib/apps/SlowQuery/utils/tableColumns'

export default function RecentSlowQueries() {
  const { t } = useTranslation()
  const {
    orderOptions,
    changeOrder,

    loadingSlowQueries,
    slowQueries,
    queryTimeRange,

    errors,

    tableColumns,
  } = useSlowQuery(
    DEF_SLOW_QUERY_COLUMN_KEYS,
    false,
    { ...DEF_SLOW_QUERY_OPTIONS, limit: 10 },
    false
  )

  return (
    <SlowQueriesTable
      key={`slow_query_${slowQueries.length}`}
      visibleColumnKeys={DEF_SLOW_QUERY_COLUMN_KEYS}
      loading={loadingSlowQueries}
      slowQueries={slowQueries}
      columns={tableColumns}
      orderBy={orderOptions.orderBy}
      desc={orderOptions.desc}
      onChangeOrder={changeOrder}
      errors={errors}
      title={
        <Link to="/slow_query">
          {t('overview.recent_slow_query.title')} <RightOutlined />
        </Link>
      }
      subTitle={
        <span>
          <DateTime.Calendar
            unixTimestampMs={queryTimeRange.beginTime * 1000}
          />{' '}
          ~{' '}
          <DateTime.Calendar unixTimestampMs={queryTimeRange.endTime * 1000} />
        </span>
      }
    />
  )
}
